// Shared worker.
//
// Identity is (origin, script URL, name option). Every page that calls
// `new SharedWorker("worker.js", { name: "counter" })` from the same origin
// connects to this single instance, instead of spawning its own worker.
//
// Lifetime: the browser keeps the worker alive as long as at least one page
// holds a port to it. When the last page closes, the worker is terminated and
// all module state below (counter, ports, the interval) is thrown away.

// Shared state across all connected pages.
let counter = 0;

// One MessagePort per connected page. We keep them so the timer can broadcast
// to everyone. There is no built-in "page disconnected" event, so entries are
// only removed when a page sends an explicit "bye" (see below).
const ports = new Set();

// The single ticker. Runs in the worker, not in any page, so closing one tab
// does not affect the cadence seen by the others.
setInterval(() => {
  counter += 1;
  for (const port of ports) {
    port.postMessage({ type: "tick", value: counter });
  }
}, 2000);

// Fired once per `new SharedWorker(...)` call from a page. `event.ports[0]` is
// this worker's end of the channel to that specific page.
self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  // Greet the new page with the current counter so it does not have to wait up
  // to 2s for the first tick, and tell it how many subscribers exist.
  port.postMessage({ type: "hello", value: counter, subscribers: ports.size });

  // Let the already-connected pages know the subscriber count changed.
  for (const other of ports) {
    if (other !== port) other.postMessage({ type: "subscribers", subscribers: ports.size });
  }

  // Best-effort disconnect: the page sends "bye" from its `beforeunload`
  // handler. This will not fire on tab crash or force-quit, so the count can
  // drift upward in those cases. A heartbeat would be more robust.
  port.onmessage = (e) => {
    if (e.data?.type === "bye") {
      ports.delete(port);
      for (const other of ports) other.postMessage({ type: "subscribers", subscribers: ports.size });
    }
  };

  // Required when using `port.onmessage = ...` (rather than addEventListener);
  // starts message delivery on this port.
  port.start();
};
