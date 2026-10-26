#!/usr/bin/env bun
/**
 * Runs `@pwa-today/pwa-check` against a production build of `apps/web`.
 *
 * The app is server-rendered by Nitro, so a static file server cannot serve
 * the real HTML: build, start the Node server on a loopback port, run the
 * same CLI CI runs, then stop the server.
 *
 * Set `PWA_CHECK_URL` to check an already running origin and skip the build:
 *   PWA_CHECK_URL=https://ritools.com bun pwa-check
 *
 * `apps/web/public/register-sw.js` carries a static
 * `navigator.serviceWorker.register("/sw.js")` so the checker can resolve the
 * worker from unminified source; the minified Workbox registration in the
 * client bundle is not reliable to parse.
 */

/* oxlint-disable promise/avoid-new, eslint/no-await-in-loop -- Child process
   events are callback-only, and each readiness probe must follow the last. */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const APP_DIR = path.join(REPO_ROOT, "apps", "web");
const SERVER_ENTRY = path.join(APP_DIR, ".output", "server", "index.mjs");
const PWA_CHECK_BIN = path.join(REPO_ROOT, "node_modules", ".bin", "pwa-check");
const PORT = Number(process.env.PWA_CHECK_PORT ?? 4311);
const LOCAL_URL = `http://127.0.0.1:${PORT}`;
const TARGET = process.env.PWA_CHECK_URL ?? LOCAL_URL;

const run = (command: string, args: string[]): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });

const waitForServer = async (proc: ReturnType<typeof spawn>) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (proc.exitCode !== null) {
      throw new Error(`The app server exited with code ${proc.exitCode}.`);
    }

    try {
      const response = await fetch(LOCAL_URL);
      if (response.ok) {
        return;
      }
    } catch {
      // The server is not up yet.
    }
    await sleep(500);
  }
  throw new Error(`The app never answered on ${LOCAL_URL}.`);
};

const stopServer = async (proc: ReturnType<typeof spawn> | undefined) => {
  if (!proc || proc.exitCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
  });
  proc.kill();
  await Promise.race([exited, sleep(10_000)]);
  if (proc.exitCode === null) {
    proc.kill("SIGKILL");
  }
};

let server: ReturnType<typeof spawn> | undefined;
let exitCode = 1;

try {
  if (TARGET === LOCAL_URL) {
    const buildCode = await run("bun", ["--filter", "@workspace/web", "build"]);
    if (buildCode !== 0) {
      throw new Error(`The web build failed with code ${buildCode}.`);
    }

    if (!existsSync(SERVER_ENTRY)) {
      throw new Error(`No server build at ${SERVER_ENTRY}.`);
    }

    server = spawn("node", [".output/server/index.mjs"], {
      cwd: APP_DIR,
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(PORT) },
      stdio: ["ignore", "inherit", "inherit"],
    });

    await waitForServer(server);
  }

  exitCode = await run(PWA_CHECK_BIN, [TARGET, "--fail-on-warn"]);
} finally {
  await stopServer(server);
}

process.exit(exitCode);
