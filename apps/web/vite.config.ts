import path from "node:path";
import process from "node:process";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools as tanstackDevtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin, PluginOption } from "vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Dev-only: alias /sw.js → VitePWA's /dev-sw.js?dev-sw for static checkers.
 * Production build emits sw.js into the client output and registers it via virtual:pwa-register.
 */
const serveDevServiceWorker = (): Plugin => ({
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url?.split("?")[0] ?? "";
      if (url === "/sw.js") {
        req.url = "/dev-sw.js?dev-sw";
      }
      next();
    });
  },
  name: "serve-dev-service-worker",
});

/** Generate the final Worker before Nitro records public asset sizes and hashes. */
const pwaBeforeNitro = (plugins: Plugin[]): Plugin[] =>
  plugins.map((plugin) => {
    if (
      plugin.name !== "vite-plugin-pwa:build" ||
      plugin.closeBundle === undefined
    ) {
      return plugin;
    }
    const { closeBundle, ...buildPlugin } = plugin;
    const generate =
      "handler" in closeBundle ? closeBundle.handler : closeBundle;
    return {
      ...buildPlugin,
      buildStart: {
        order: "pre",
        sequential: true,
        async handler() {
          if (this.environment.name === "nitro") {
            await generate.call(this);
          }
        },
      },
    };
  });

export default defineConfig({
  // Expose portless's worktree-aware URL to import.meta.env (see core/config/env.ts).
  envPrefix: ["VITE_", "PORTLESS_"],
  plugins: [
    tanstackDevtools(),
    tailwindcss(),
    tanstackStart(),
    nitro({
      // The metadata engine is downloaded on first read. Serve compressed WASM.
      compressPublicAssets: { gzip: true, brotli: true },
      routeRules: {
        "/assets/**": {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/manifest.webmanifest": {
          headers: {
            "cache-control": "public, max-age=0, must-revalidate",
            "content-type": "application/manifest+json",
          },
        },
        "/sw.js": {
          headers: {
            "cache-control": "public, max-age=0, must-revalidate",
            "service-worker-allowed": "/",
          },
        },
      },
    }),
    // Must come after `tanstackStart()`.
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    visualizer({
      filename: "html/visualizer-stats.html",
    }) satisfies PluginOption,
    serveDevServiceWorker(),
    pwaBeforeNitro(
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: false,
        integration: {
          // Start builds the client into the Nitro preset's public dir
          // (`.output/public`, `.vercel/output/static`, ...), not `build.outDir`.
          // Emit the service worker there and precache what is really served.
          configureOptions: (viteConfig, options) => {
            options.outDir = viteConfig.environments.client?.build.outDir;
          },
        },
        manifest: {
          background_color: "#f6f4ef",
          description:
            "Small utilities that run entirely on your device. Compress images, and more, without an upload, a signup, or a per-month limit.",
          display: "standalone",
          display_override: ["window-controls-overlay"],
          file_handlers: [
            {
              accept: {
                "text/plain": [".txt", ".tab"],
                "text/csv": [".csv"],
                "text/tab-separated-values": [".tsv"],
                "application/vnd.ms-excel": [".xls"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                  [".xlsx"],
              },
              action: "/tabular",
            },
          ],
          handle_links: "preferred",
          icons: [
            {
              sizes: "64x64",
              src: "pwa-64x64.png",
              type: "image/png",
            },
            {
              sizes: "192x192",
              src: "pwa-192x192.png",
              type: "image/png",
            },
            {
              sizes: "384x384",
              src: "pwa-384x384.png",
              type: "image/png",
            },
            {
              sizes: "512x512",
              src: "pwa-512x512.png",
              type: "image/png",
            },
            {
              sizes: "1024x1024",
              src: "pwa-1024x1024.png",
              type: "image/png",
            },
            {
              purpose: "maskable",
              sizes: "192x192",
              src: "maskable-icon-192x192.png",
              type: "image/png",
            },
            {
              purpose: "maskable",
              sizes: "384x384",
              src: "maskable-icon-384x384.png",
              type: "image/png",
            },
            {
              purpose: "maskable",
              sizes: "512x512",
              src: "maskable-icon-512x512.png",
              type: "image/png",
            },
            {
              purpose: "maskable",
              sizes: "1024x1024",
              src: "maskable-icon-1024x1024.png",
              type: "image/png",
            },
          ],
          name: "Ritools",
          orientation: "any",
          screenshots: [
            {
              form_factor: "wide",
              sizes: "1280x720",
              src: "screenshot-wide.png",
              type: "image/png",
            },
            {
              form_factor: "narrow",
              sizes: "750x1334",
              src: "screenshot-narrow.png",
              type: "image/png",
            },
          ],
          share_target: {
            action: "/",
            method: "GET",
            params: {
              text: "text",
              title: "title",
              url: "url",
            },
          },
          short_name: "Ritools",
          shortcuts: [
            {
              description: "Open the home page",
              name: "Home",
              short_name: "Home",
              url: "/",
            },
          ],
          theme_color: "#d7001a",
        },
        injectManifest: {
          // `wasm` is deliberately absent: the AVIF encoder is over Workbox's
          // 2 MiB precache limit, so no codec is precached. Each one is cached at
          // runtime on first use instead, by the route in `src/sw.ts`.
          globPatterns: [
            "**/*.{html,css,js,json,txt,ico,svg,jpg,png,webp,woff,woff2,ttf,eot,otf}",
          ],
          // Source image for `pwa-assets.config.ts`; the page never loads it.
          // Font licenses, and the static instances `brand:gen` reads, ship
          // beside the fonts but are never fetched by a page.
          globIgnores: [
            "logo.png",
            "fonts/licenses/**",
            "fonts/instances/**",
            "assets/catalog-page-*",
            "assets/tabular*.worker-*.js",
            "assets/tabular.pdf-*.js",
            "fonts/pdf/**",
            "folio/**",
          ],
        },
        devOptions: {
          enabled: process.env.NODE_ENV === "development",
          suppressWarnings: true,
          type: "module",
        },
      })
    ),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // Module Workers load their format code on demand. ES output keeps the PDF
  // writer in a separate lazy chunk instead of inlining jsPDF in the Worker.
  worker: {
    format: "es",
  },
  optimizeDeps: {
    // Reached only via virtual modules (PWA register, dev service worker), so
    // the dep scanner misses them and Vite reloads the page on first visit.
    include: [
      "workbox-window",
      "workbox-precaching",
      "workbox-routing",
      "workbox-strategies",
      // The Expose engine is reached only from a Worker that starts on the
      // first read, so the dep scanner misses it and Vite reloads the page
      // mid-read. Pre-bundle it instead.
      "@xmldom/xmldom",
      "@colorhythm/exiftool-wasm",
    ],
  },
  server: {
    port: 3001,
    forwardConsole: true,
    watch: {
      // The Playwright reporter writes its HTML report while the suite runs.
      // Watching it makes Vite reload the page under test.
      ignored: ["**/playwright-report/**", "**/playwright-test-results/**"],
    },
  },
});
