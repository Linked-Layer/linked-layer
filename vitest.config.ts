import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkg = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@recall/core": pkg("./packages/core/src/index.ts"),
      "@recall/db": pkg("./packages/db/src/index.ts"),
      "@recall/embed": pkg("./packages/embed/src/index.ts"),
      "@recall/connectors": pkg("./packages/connectors/src/index.ts"),
      "@recall/distill": pkg("./packages/distill/src/index.ts"),
      "@recall/gating": pkg("./packages/gating/src/index.ts"),
      "@recall/engine": pkg("./packages/engine/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/test/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
