#!/usr/bin/env node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const tempRoot = await mkdtemp(join(tmpdir(), "ai-tools-smoke-"));

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      const output = [stdout, stderr].filter(Boolean).join("\n");
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}\n${output}`));
    });
  });
}

function assertIncludes(output, expected) {
  if (!output.includes(expected)) {
    throw new Error(`Expected output to include ${JSON.stringify(expected)}.\nActual output:\n${output}`);
  }
}

try {
  await run("npm", ["run", "build"]);

  const pack = await run(
    "npm",
    ["pack", "--workspace", "@premierstudio/ai-tools", "--pack-destination", tempRoot],
    { capture: true },
  );
  const tarballName = pack.stdout
    .trim()
    .split(/\r?\n/)
    .find((line) => line.endsWith(".tgz"));

  if (!tarballName) {
    throw new Error(`Unable to find packed tarball name in npm pack output:\n${pack.stdout}`);
  }

  const tarballPath = join(tempRoot, tarballName);
  if (!existsSync(tarballPath)) {
    throw new Error(`Packed tarball was not created: ${tarballPath}`);
  }

  const fixture = join(tempRoot, "fixture");
  await run("npm", ["init", "-y"], { cwd: tempRoot, capture: true });
  await run("mkdir", ["-p", fixture], { capture: true });
  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify({ name: "ai-tools-smoke-fixture", version: "0.0.0", type: "module" }, null, 2) +
      "\n",
    "utf-8",
  );

  await run("npm", ["install", "--ignore-scripts", tarballPath], { cwd: fixture, capture: true });

  const bin = join(fixture, "node_modules", ".bin", process.platform === "win32" ? "ai-tools.cmd" : "ai-tools");

  const help = await run(bin, ["help"], { cwd: fixture, capture: true });
  assertIncludes(help.stdout, "Unified CLI for ai-tools engines");

  await writeFile(
    join(fixture, "ai-plugin.config.mjs"),
    [
      'import { definePlugin } from "@premierstudio/ai-tools";',
      "",
      "export default definePlugin({",
      '  id: "release-confidence",',
      '  name: "Release Confidence",',
      '  version: "0.1.0",',
      '  description: "Smoke-test portable testing bundle.",',
      "  mcpServers: [",
      "    {",
      '      id: "premier-mcp",',
      '      name: "Premier MCP",',
      '      transport: { type: "stdio", command: "premier-mcp" },',
      "    },",
      "  ],",
      "  skills: [",
      "    {",
      '      id: "testing-slice",',
      '      name: "Testing Slice",',
      '      content: "Write the failing test first, then implement.",',
      "    },",
      "  ],",
      "  rules: [",
      "    {",
      '      id: "tdd-required",',
      '      name: "TDD Required",',
      '      content: "Every implementation starts with a failing test.",',
      '      scope: { type: "always" },',
      "    },",
      "  ],",
      "  agents: [",
      "    {",
      '      id: "qa-architect",',
      '      name: "QA Architect",',
      '      instructions: "Find missing release-confidence coverage.",',
      "    },",
      "  ],",
      "});",
    ].join("\n"),
    "utf-8",
  );

  const plan = await run(
    bin,
    [
      "plugins",
      "plan",
      "--config=ai-plugin.config.mjs",
      "--tools=codex,opencode,claude-code,antigravity-cli",
      "--force",
    ],
    { cwd: fixture, capture: true },
  );
  assertIncludes(plan.stdout, "Release Confidence");
  assertIncludes(plan.stdout, "Codex");
  assertIncludes(plan.stdout, "OpenCode");
  assertIncludes(plan.stdout, "Claude Code");
  assertIncludes(plan.stdout, "Antigravity CLI");
  assertIncludes(plan.stdout, "agents: ready");

  const installDryRun = await run(
    bin,
    [
      "plugins",
      "install",
      "--config=ai-plugin.config.mjs",
      "--tools=codex,opencode,claude-code,antigravity-cli",
      "--force",
      "--dry-run",
    ],
    { cwd: fixture, capture: true },
  );
  assertIncludes(installDryRun.stdout, "[dry-run] No files were written.");

  console.log("ai-tools package smoke passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
