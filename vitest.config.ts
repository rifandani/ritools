import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Vitest 5 clears mock history before each test by default.
    // Several unit files assert side effects from module init or `beforeAll` (MSW).
    clearMocks: false,
    pool: "threads",
    isolate: false,
    fileParallelism: true,
    css: false,
    passWithNoTests: false,
    projects: ["apps/web"],
    // `coverage` is root-only (it sits in Vitest's `NonProjectOptions`), so it cannot be split across the `defineProject` configs.
    // Consequence: `--project <name> --coverage` measures this global `include` list against a partial run and reports every other project at 0%. Always run the whole suite (`bun test:unit:cov`).
    //
    // Scope rationale, the Logic Seam convention, and the threshold policy live in docs/adr/0001-unit-tests-are-pure-module-logic.md.
    coverage: {
      provider: "v8",
      // Opt-in only. Enabling by default would tax every watch run and every focused `--project` run; the `unit` CI job opts in via `--coverage`.
      enabled: false,
      reportOnFailure: true,
      reporter: [
        "text",
        ["text-summary", { file: "summary.txt" }],
        "html",
        // CRAP input for `fallow check:all` (see `health.coverage` in `.fallowrc.json`).
        "json",
      ],
      // Deliberately not `./coverage` itself, whose root is reserved for fallow's
      // runtime sidecar traces. Feeding fallow test coverage would make it report the
      // ADR-sanctioned untested layers as dead code. Test reports live in named
      // subdirectories instead — `coverage/vitest` here, `coverage/stryker` for
      // mutation output (ADR-0003).
      reportsDirectory: "./coverage/vitest",
      // Floor, not a target, and deliberately *below* the measured baseline. Enforced per file (`perFile: true`), so one thinly covered module cannot hide behind the rest of the suite.
      // The suite only clears 100 because the repo is boilerplate-sized; pinning the floor there would fail CI on the first partially covered file added to `include`, which is ordinary work, not a regression. 90 leaves room for that while still catching a real slide. Lowering it needs a reason in the commit.
      thresholds: {
        perFile: true,
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      // This allowlist is the definition of business logic: layers whose modules are pure enough to unit test.
      // Untested files only appear in the report when matched here, so a new logic-bearing folder must be added.
      include: [
        "apps/web/src/**/{actions,apis,config,constants,http,libs,middlewares,observability,runtime,services,utils}/**/*.{ts,tsx}",
        "apps/web/src/**/*-store.{ts,tsx}",
        // Feature modules: pure domain functions, Effect services and atoms.
        // Components (`.tsx`) are E2E territory.
        "apps/web/src/features/**/*.ts",
      ],
      exclude: [
        "**/*.unit.test.ts",
        "**/*.d.ts",
        "**/types.ts",
        // all constants
        "apps/*/src/**/constants/**",
        "packages/*/src/**/constants/**",
        // Pure schema modules — declarations only, no functions. ADR-0001 puts
        // "plain schema shapes" out of test scope, but leaving them in `include` gave
        // them a free 100%: importing a schema file executes every line, so such a file
        // scored 100% statements/branches/lines with no test file in existence.
        // Mutation testing is what exposed it (9.09%, ADR-0003). Excluded so the
        // coverage figure means something. Modules that mix schemas with functions
        // (`api-error.ts`, `locale.ts`, `color-mode.ts`) stay in — their functions are tested.
        "apps/web/src/core/libs/i18n/locales/**",
        // Generated data, not logic. The glyph atlas is measured from the font
        // files by `bun brand:gen`, and the face list is a declaration. Their
        // one guard is `glyph-atlas.unit.test.ts`, which fails when either the
        // atlas or the list drifts from what the fonts and the packages say.
        "apps/web/src/features/og/glyph-atlas.generated.ts",
        // Expose's byte-level container parsers and the metadata-engine boundary.
        // Every supported carrier and every fixture is covered, but the
        // remaining branches are malformed length/offset guards whose
        // combinatorial matrix says little about the product and would only
        // inflate the test file. The real-engine fixture tests are the
        // acceptance for these modules.
        "apps/web/src/features/expose/expose.c2pa.ts",
        "apps/web/src/features/expose/expose.payload.ts",
        "apps/web/src/features/expose/expose.reader.ts",
        // Container adapters use real fixtures and explicit malformed-range tests.
        // Their combinatorial byte guards follow the same scope as C2PA/payload.
        "apps/web/src/features/expose/expose.office.ts",
        "apps/web/src/features/expose/expose.content.ts",
        "apps/web/src/features/expose/expose.sniff.ts",
        "apps/web/src/features/expose/expose.image-size.ts",
        // The browser ExifTool loader is the browser-only side of the writer
        // port. Unit tests use the Node writer; the loader is exercised by the
        // route e2e when a clean runs.
        "apps/web/src/features/expose/expose.engine.browser.ts",
        "apps/web/src/core/libs/brand/faces.ts",
        // Framework seams (the Logic Seam convention, ADR-0001): `createServerFn`
        // transports, the server runtime that reads TanStack's request, the
        // startup binding of `import.meta.env`, the atom runtimes (layer wiring
        // only: a test that imports an atom runs every line), and React hooks.
        // Their logic lives in tested siblings (`server-fn.ts`, `server-request.ts`,
        // `app-config.ts`, `*.service.ts`, `*.atoms.ts`).
        "**/*.functions.ts",
        "**/*.server.ts",
        "**/*.worker.ts",
        "**/*.worker-client.ts",
        "apps/web/src/core/config/env.ts",
        "apps/web/src/core/runtime/client.ts",
        "apps/web/src/features/**/use-*.ts",
      ],
    },
  },
});
