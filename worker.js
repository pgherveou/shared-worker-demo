// Shared worker.
//
// Identity is (origin, script URL, name option). Every page that calls
// `new SharedWorker("worker.js", { name: "counter" })` from the same origin
// connects to this single instance, instead of spawning its own worker.
//
// Lifetime: the browser keeps the worker alive as long as at least one page
// holds a port to it. When the last page closes, the worker is terminated and
// all module state below (counter, ports, the interval) is thrown away.

const HEARTBEAT_MS = 5_000;
const STALE_AFTER_MS = 15_000; // ~3 missed heartbeats before we drop a port

// Shared state across all connected pages.
let counter = 0;

// One MessagePort per connected page, plus the timestamp of the last message
// we received on it. There is no "page disconnected" event for SharedWorker,
// so we infer death from missed heartbeats and prune stale ports below.
const ports = new Set();
const lastSeen = new WeakMap();

function broadcastSubscribers() {
  for (const port of ports) port.postMessage({ type: "subscribers", subscribers: ports.size });
}

// The single ticker. Runs in the worker, not in any page, so closing one tab
// does not affect the cadence seen by the others.
setInterval(() => {
  counter += 1;
  for (const port of ports) {
    port.postMessage({ type: "tick", value: counter });
  }
}, 2000);

// Prune ports we have not heard from recently. Catches abrupt deaths (tab
// crash, force-quit, OS killing a backgrounded mobile tab) where the page
// never gets a chance to send "bye".
setInterval(() => {
  const cutoff = Date.now() - STALE_AFTER_MS;
  let changed = false;
  for (const port of ports) {
    if ((lastSeen.get(port) ?? 0) < cutoff) {
      ports.delete(port);
      changed = true;
    }
  }
  if (changed) broadcastSubscribers();
}, HEARTBEAT_MS);

// Fired once per `new SharedWorker(...)` call from a page. `event.ports[0]` is
// this worker's end of the channel to that specific page.
self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  lastSeen.set(port, Date.now());

  // Greet the new page with the current counter so it does not have to wait up
  // to 2s for the first tick, and tell it how many subscribers exist.
  port.postMessage({ type: "hello", value: counter, subscribers: ports.size });

  // Let the already-connected pages know the subscriber count changed.
  for (const other of ports) {
    if (other !== port) other.postMessage({ type: "subscribers", subscribers: ports.size });
  }

  port.onmessage = (e) => {
    // Any message counts as a sign of life, including the periodic "ping".
    lastSeen.set(port, Date.now());
    if (e.data?.type === "bye") {
      ports.delete(port);
      broadcastSubscribers();
    }
  };

  // Required when using `port.onmessage = ...` (rather than addEventListener);
  // starts message delivery on this port.
  port.start();
};
