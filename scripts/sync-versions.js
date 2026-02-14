#!/usr/bin/env node

/**
 * Sync all workspace package versions to the release version.
 * Called by semantic-release via @semantic-release/exec prepareCmd.
 *
 * Usage: node scripts/sync-versions.js <version>
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/sync-versions.js <version>");
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
const packagesDir = join(root, "packages");

// Update root package.json
const rootPkgPath = join(root, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
rootPkg.version = version;
writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
console.log(`  root → ${version}`);

// Update each workspace package.json
const entries = readdirSync(packagesDir);
for (const entry of entries) {
  const pkgPath = join(packagesDir, entry, "package.json");
  try {
    statSync(pkgPath);
  } catch {
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = version;

  // Pin workspace:* deps to the release version for npm publish compatibility
  for (const depType of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[depType];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (name.startsWith("@premierstudio/") && (range === "workspace:*" || range === "*")) {
        deps[name] = `^${version}`;
        console.log(`    ${pkg.name} dep ${name} → ^${version}`);
      }
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ${pkg.name} → ${version}`);
}

console.log(`\nAll packages synced to v${version}`);
