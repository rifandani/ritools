import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

export default defineConfig({
  extends: [
    core,
    antiSlop,
    // github + sonarjs stay out; react-doctor (incl. compiler overlap) stays.
    selectJsPlugins(["react-doctor"]),
    react,
    tanstack,
    tanstackJsPlugins,
  ],
  // oxlint does not merge `settings` from extends; curated react-doctor mode.
  settings: jsPluginSettings,
  rules: {
    "sort-keys": "off",
    "no-inline-comments": "off",
    "no-nested-ternary": "off",
    "unicorn/no-array-reduce": "off",
    "react/jsx-no-constructed-context-values": "off",
    // Next.js `page`/`error`/`not-found` and Expo route files use function declarations; ultracite 7.10 forces arrows.
    "react/function-component-definition": "off",
    // Next metadata + TanStack `Route` + context modules export non-components.
    "react-doctor/only-export-components": "off",
    // Existing `oxlint-disable` on hooks/effects; compiler still runs.
    "react/rule-suppression": "off",
    // Effect defines errors with `class X extends Schema.TaggedError<X>()(...)`.
    // The rule reads that factory call as an unthrown error, and its autofix
    // inserts `new`, which breaks the class. Effect code yields errors instead.
    "unicorn/throw-new-error": "off",
    // Effect pairs a schema value with a same-name interface
    // (`const User = Schema.Struct(...)` + `interface User`). TypeScript merges
    // the two and reports a real redeclaration itself.
    "no-redeclare": "off",
    // Effect code passes anonymous generators to `Effect.gen` and `Effect.fn`;
    // `Effect.fn("Domain.operation")` names the span and the stack frame.
    "func-names": ["error", "always", { generators: "never" }],
  },
  overrides: [
    {
      // Server actions, `next/headers`, `server-only` and the otel singletons are module-scoped by design, so their unit tests mock the module rather than reshaping production code around injection. Every other anti-slop rule stays on for test files.
      files: ["**/*.unit.test.ts", "**/*.unit.test.tsx", "**/e2e/**"],
      rules: {
        "anti-slop/no-module-mocking": "off",
      },
    },
    {
      // `toErrorMessage` is the parser at a boundary where the input is
      // definitionally unparsed: a caught failure. It runs a schema against
      // every shape before trusting it, and a narrower parameter would only
      // move the cast to each caller.
      files: ["apps/web/src/core/utils/error.ts"],
      rules: {
        "anti-slop/no-unknown-parameters": "off",
      },
    },
    {
      files: [
        "apps/web/src/core/libs/i18n/locales/en-US.ts",
        "apps/web/src/core/libs/i18n/locales/id-ID.ts",
      ],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "**/apps/web/src/routeTree.gen.ts",
    "**/apps/*/src/core/components/ui/**",
    "**/.agents",
    "**/.claude",
    "**/.cursor",
    "**/.repos",
    "**/repos",
    "**/.impeccable",
    "**/docs",
  ],
});
