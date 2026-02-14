#!/usr/bin/env node

/**
 * Publish workspace packages that aren't handled by @semantic-release/npm.
 *
 * Core (@premierstudio/ai-hooks) is published by @semantic-release/npm.
 * This script publishes @premierstudio/plannable.
 * All other workspace packages are private and skipped.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const packagesDir = "packages";

// Ensure .npmrc exists with the token for workspace publishes.
// semantic-release only configures auth for the core package publish;
// workspace packages need auth too.
const npmToken = process.env.NPM_TOKEN;
if (npmToken) {
  const npmrcPath = join(homedir(), ".npmrc");
  writeFileSync(npmrcPath, `//registry.npmjs.org/:_authToken=${npmToken}\n`);
}

const failed = [];

for (const entry of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, entry, "package.json");
  try {
    statSync(pkgPath);
  } catch {
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  // Skip core (published by @semantic-release/npm) and private packages
  if (pkg.name === "@premierstudio/ai-hooks" || pkg.private) continue;

  console.log(`Publishing ${pkg.name}...`);
  try {
    execSync(`npm publish --access public`, {
      stdio: "inherit",
      cwd: resolve(packagesDir, entry),
    });
    console.log(`  ✓ Published ${pkg.name}`);
  } catch (err) {
    console.error(`  ✗ Failed to publish ${pkg.name}: ${err.message}`);
    failed.push(pkg.name);
  }
}

if (failed.length > 0) {
  console.error(`\nFailed to publish ${failed.length} package(s): ${failed.join(", ")}`);
  process.exit(1);
}

console.log("\n✓ All workspace packages published successfully");
