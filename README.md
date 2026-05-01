# shared-worker-demo

Tiny demo of a `SharedWorker` shared across two pages. The worker emits an
incrementing counter every 2 seconds, and every connected page sees the same
value in lockstep.

**Live demo:** https://pgherveou.github.io/shared-worker-demo/

Open the live demo, then open it again in a second tab. Both tabs tick in sync,
and the `subscribers:` line reflects the connection count.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/ and http://localhost:8000/page2.html.

## Notes

- `SharedWorker` is not supported on Safari (desktop or iOS). Use Chrome or
  Firefox.
- The worker is terminated by the browser once the last connected page closes,
  so the counter resets on a fresh start.
