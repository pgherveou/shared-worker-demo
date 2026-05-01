// Page-side client for the shared counter worker.
// Loaded by both index.html and page2.html, which share the same DOM IDs.

const valueEl = document.getElementById("value");
const metaEl = document.getElementById("meta");

// Connect to the shared worker. The (origin, URL, name) triple identifies the
// instance, so every page that uses these exact arguments joins the same
// worker rather than spawning a new one. If the worker is not running yet
// (e.g. this is the first tab), the browser starts it now.
const worker = new SharedWorker("worker.js", { name: "counter" });

// All communication with a SharedWorker goes through `worker.port`, a
// MessagePort. There is no `worker.onmessage` shortcut like with a dedicated
// Worker.
worker.port.onmessage = (e) => {
  const msg = e.data;
  // "hello" is the initial state sent on connect, "tick" is the 2s broadcast.
  if (msg.type === "hello" || msg.type === "tick") valueEl.textContent = msg.value;
  if (msg.subscribers !== undefined) metaEl.textContent = `subscribers: ${msg.subscribers}`;
};

// Required because we used `port.onmessage = ...` instead of addEventListener.
// Without this, messages from the worker would queue up and never fire.
worker.port.start();

// Heartbeat so the worker can detect dead pages it never got a "bye" from
// (tab crash, force-quit, OS killing a backgrounded mobile tab). The worker
// prunes ports it has not heard from in ~15s.
setInterval(() => worker.port.postMessage({ type: "ping" }), 5_000);

// Best-effort "I am leaving" signal so the worker can decrement its subscriber
// count immediately rather than waiting for the heartbeat to time out. Listen
// to both events: `pagehide` fires more reliably on mobile and with bfcache,
// `beforeunload` covers some desktop cases the former misses.
function sayBye() {
  worker.port.postMessage({ type: "bye" });
}
window.addEventListener("pagehide", sayBye);
window.addEventListener("beforeunload", sayBye);
