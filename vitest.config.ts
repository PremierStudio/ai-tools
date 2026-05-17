import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "packages/hooks/src/**/*.test.ts",
      "packages/mcp/src/**/*.test.ts",
      "packages/skills/src/**/*.test.ts",
      "packages/agents/src/**/*.test.ts",
      "packages/rules/src/**/*.test.ts",
      "packages/cli/src/**/*.test.ts",
      "packages/sessions/src/**/*.test.ts",
      "packages/ui/src/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: [
        "packages/hooks/src/**/*.ts",
        "packages/mcp/src/**/*.ts",
        "packages/skills/src/**/*.ts",
        "packages/agents/src/**/*.ts",
        "packages/rules/src/**/*.ts",
        "packages/cli/src/**/*.ts",
        "packages/sessions/src/**/*.ts",
        "packages/ui/src/**/*.ts",
      ],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/index.ts", // barrel re-exports
        "packages/*/src/adapters/all.ts", // side-effect registrations
        "packages/hooks/src/types/adapter.ts", // type-only
        "packages/hooks/src/types/config.ts", // type-only
        "packages/hooks/src/types/events.ts", // type-only
        "packages/hooks/src/cli/bin.ts", // entry-point shim
        "packages/mcp/src/types/*.ts", // type-only
        "packages/mcp/src/cli/bin.ts",
        "packages/skills/src/types/*.ts",
        "packages/skills/src/cli/bin.ts",
        "packages/agents/src/types/*.ts",
        "packages/agents/src/cli/bin.ts",
        "packages/rules/src/types/*.ts",
        "packages/rules/src/cli/bin.ts",
        "packages/cli/src/cli/bin.ts",
        "packages/sessions/src/types/*.ts",
        "packages/sessions/src/cli/bin.ts",
        "packages/ui/src/types.ts",
        "packages/ui/src/cli/bin.ts",
        "**/dist/**",
      ],
    },
  },
});
