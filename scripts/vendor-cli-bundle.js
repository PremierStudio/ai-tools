#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const cliRoot = join(repoRoot, "packages", "cli");
const vendorRoot = join(cliRoot, "node_modules", "@premierstudio");

const internalPackages = [
  { name: "@premierstudio/ai-tools-agents", dir: join(repoRoot, "packages", "agents") },
  { name: "@premierstudio/ai-tools-hooks", dir: join(repoRoot, "packages", "hooks") },
  { name: "@premierstudio/ai-tools-mcp", dir: join(repoRoot, "packages", "mcp") },
  { name: "@premierstudio/ai-tools-rules", dir: join(repoRoot, "packages", "rules") },
  { name: "@premierstudio/ai-tools-sessions", dir: join(repoRoot, "packages", "sessions") },
  { name: "@premierstudio/ai-tools-skills", dir: join(repoRoot, "packages", "skills") },
  { name: "@premierstudio/ai-tools-tui", dir: join(repoRoot, "packages", "ui") },
];

function writePackageJson(sourcePath, targetPath) {
  const pkg = JSON.parse(readFileSync(sourcePath, "utf8"));
  delete pkg.private;
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

rmSync(vendorRoot, { recursive: true, force: true });
mkdirSync(vendorRoot, { recursive: true });

for (const entry of internalPackages) {
  const namePart = entry.name.split("/")[1];
  const targetDir = join(vendorRoot, namePart);
  mkdirSync(targetDir, { recursive: true });

  const distSource = join(entry.dir, "dist");
  if (!existsSync(distSource)) {
    throw new Error(`Missing dist for ${entry.name}. Run the workspace build before packing.`);
  }

  cpSync(distSource, join(targetDir, "dist"), { recursive: true });
  writePackageJson(join(entry.dir, "package.json"), join(targetDir, "package.json"));

  for (const asset of ["README.md", "LICENSE"]) {
    const source = join(entry.dir, asset);
    if (existsSync(source)) {
      cpSync(source, join(targetDir, asset));
    }
  }
}

console.log(`Vendored ${internalPackages.length} internal packages into packages/cli/node_modules`);
