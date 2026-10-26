/* eslint-disable eslint/no-await-in-loop -- the proxy deliberately sends WASM chunks at a fixed rate */
import http from "node:http";
import { setTimeout } from "node:timers/promises";

const target = new URL(process.argv[2] ?? "http://localhost:4216");
const port = Number(process.argv[3] ?? 4317);
const bytesPerSecond = 2_000_000;
http
  .createServer((request, response) => {
    const requestPath = request.url ?? "/";
    if (!requestPath.startsWith("/") || requestPath.startsWith("//")) {
      response.writeHead(400).end("Expected an origin-form request target");
      return;
    }
    const forward = http.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: request.method,
        path: requestPath,
        headers: Object.fromEntries([
          ...Object.entries(request.headers),
          ["host", target.host],
        ]),
      },
      (upstream) => {
        response.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.on("error", () => response.destroy());
        if (!requestPath.endsWith(".wasm")) {
          upstream.pipe(response);
          return;
        }
        const send = async () => {
          try {
            for await (const chunk of upstream) {
              for (let at = 0; at < chunk.length; at += 32_768) {
                const part = chunk.subarray(at, at + 32_768);
                response.write(part);
                await setTimeout((part.length / bytesPerSecond) * 1000);
              }
            }
            response.end();
          } catch {
            response.destroy();
          }
        };
        void send();
      }
    );
    forward.on("error", () => response.destroy());
    request.pipe(forward);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `WASM throttle: http://localhost:${port}, ${bytesPerSecond} bytes/s, upstream ${target}`
    )
  );
