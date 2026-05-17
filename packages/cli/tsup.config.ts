import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/hooks.ts",
      "src/mcp.ts",
      "src/skills.ts",
      "src/agents.ts",
      "src/rules.ts",
      "src/sessions.ts",
      "src/tui.ts",
    ],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node22",
    outDir: "dist",
    splitting: false,
    treeshake: true,
  },
  {
    entry: ["src/cli/bin.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    target: "node22",
    outDir: "dist/cli",
    splitting: false,
    treeshake: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
