import path from "node:path";

import { defineProject } from "vitest/config";

const root = import.meta.dirname;

export default defineProject({
  // web tsconfig uses jsx: "preserve". oxc must transform JSX if a test imports a .tsx module.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@test/msw": path.join(root, "../../vitest.msw.ts"),
    },
  },
  test: {
    name: "web",
    include: ["src/**/*.unit.test.ts"],
    environment: "node",
    setupFiles: [
      path.join(root, "../../vitest.setup.ts"),
      path.join(root, "../../vitest.msw-setup.ts"),
    ],
  },
});
