import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node22",
    splitting: false,
    define: {
      PKG_VERSION: JSON.stringify(pkg.version),
    },
  },
  {
    entry: ["src/bin.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    target: "node22",
    splitting: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
    define: {
      PKG_VERSION: JSON.stringify(pkg.version),
    },
  },
]);
