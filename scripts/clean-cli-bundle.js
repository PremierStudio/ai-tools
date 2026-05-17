#!/usr/bin/env node

import { rmSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const vendorRoot = join(repoRoot, "packages", "cli", "node_modules", "@premierstudio");

rmSync(vendorRoot, { recursive: true, force: true });

console.log("Cleaned vendored internal packages from packages/cli/node_modules");
