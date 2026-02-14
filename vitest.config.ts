import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "packages/core/src/**/*.test.ts",
      "packages/plannable/src/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "packages/core/src/**/*.ts",
        "packages/plannable/src/**/*.ts",
      ],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/index.ts", // barrel re-exports
        "packages/core/src/types/adapter.ts", // type-only
        "packages/core/src/types/config.ts", // type-only
        "packages/core/src/types/events.ts", // type-only
        "packages/core/src/cli/bin.ts", // entry-point shim
        "**/dist/**",
      ],
    },
  },
});
