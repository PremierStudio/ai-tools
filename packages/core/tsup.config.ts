import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/hooks/index.ts",
      "src/adapters/index.ts",
      "src/adapters/all.ts",
      "src/cli/index.ts",
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
