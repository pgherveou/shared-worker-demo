const valueEl = document.getElementById("value");
const metaEl = document.getElementById("meta");

const worker = new SharedWorker("worker.js", { name: "counter" });
worker.port.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "hello" || msg.type === "tick") valueEl.textContent = msg.value;
  if (msg.subscribers !== undefined) metaEl.textContent = `subscribers: ${msg.subscribers}`;
};
worker.port.start();

window.addEventListener("beforeunload", () => {
  worker.port.postMessage({ type: "bye" });
});
