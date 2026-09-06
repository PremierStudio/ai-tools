#!/usr/bin/env node

import { spawnSync } from "node:child_process";

/** Stable substring of `ai-tools help` that post-publish CI asserts. */
export const PUBLISHED_HELP_MARKER = /ai-tools\s+-\s+Unified CLI/;

export function isPublishedHelpHealthy(status, output) {
  return status === 0 && PUBLISHED_HELP_MARKER.test(output);
}

export function runHelp(pkg = "@itz4blitz/ai-tools@latest") {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(npx, ["--yes", "--package", pkg, "ai-tools", "help"], {
    encoding: "utf-8",
    shell: process.platform === "win32",
    env: { ...process.env, npm_config_yes: "true" },
  });
}

export async function smokePublished(options = {}) {
  const pkg = options.pkg ?? process.env.AI_TOOLS_SMOKE_PACKAGE ?? "@itz4blitz/ai-tools@latest";
  const maxAttempts = Number(options.maxAttempts ?? process.env.AI_TOOLS_SMOKE_ATTEMPTS ?? 12);
  const waitMs = Number(options.waitMs ?? process.env.AI_TOOLS_SMOKE_WAIT_MS ?? 15000);
  const run = options.runHelp ?? runHelp;
  const sleep =
    options.sleep ??
    ((ms) => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    });
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = run(pkg);
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (isPublishedHelpHealthy(result.status, output)) {
      log("ai-tools published smoke passed");
      return 0;
    }
    log(`attempt ${attempt}/${maxAttempts} failed (status=${result.status})`);
    log(output.trim() || "(no stdout/stderr)");
    if (attempt < maxAttempts) sleep(waitMs);
  }

  error("ai-tools published smoke failed after retries");
  return 1;
}

const invokedDirectly = process.argv[1]
  ?.replaceAll("\\", "/")
  .endsWith("scripts/smoke-published.mjs");
if (invokedDirectly) {
  process.exit(await smokePublished());
}
