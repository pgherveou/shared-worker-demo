// Shared worker: one instance shared by all pages on the same origin.
// Emits an incrementing counter every 2s to every connected page.

let counter = 0;
const ports = new Set();

setInterval(() => {
  counter += 1;
  for (const port of ports) {
    port.postMessage({ type: "tick", value: counter });
  }
}, 2000);

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);

  port.postMessage({ type: "hello", value: counter, subscribers: ports.size });
  for (const other of ports) {
    if (other !== port) other.postMessage({ type: "subscribers", subscribers: ports.size });
  }

  port.onmessage = (e) => {
    if (e.data?.type === "bye") {
      ports.delete(port);
      for (const other of ports) other.postMessage({ type: "subscribers", subscribers: ports.size });
    }
  };

  port.start();
};
