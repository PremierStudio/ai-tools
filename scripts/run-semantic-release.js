#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadPackageName() {
  const packageJsonPath = resolve(process.cwd(), "packages/cli/package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  if (!packageJson.name || typeof packageJson.name !== "string") {
    throw new Error(`Unable to determine package name from ${packageJsonPath}`);
  }
  return packageJson.name;
}

async function writeGithubOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

async function packageExistsOnNpm(packageName) {
  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  const response = await fetch(registryUrl, {
    headers: { accept: "application/json" },
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to check npm registry for ${packageName}: ${response.status} ${response.statusText}`,
    );
  }

  return true;
}

async function main() {
  const packageName = await loadPackageName();
  const packageExists = await packageExistsOnNpm(packageName);
  const env = { ...process.env };

  if (packageExists) {
    await writeGithubOutput("publish_ready", "true");
    // Avoid stale tokens interfering with OIDC-based publish verification.
    delete env.NPM_TOKEN;
    console.log(`Publishing ${packageName} with npm trusted publishing (OIDC).`);
  } else if (env.NPM_TOKEN) {
    await writeGithubOutput("publish_ready", "true");
    console.log(
      `Bootstrapping first publish for ${packageName} with NPM_TOKEN because npm trusted publishing cannot create an initial package version yet.`,
    );
  } else if (env.ALLOW_MISSING_INITIAL_NPM_TOKEN === "true") {
    await writeGithubOutput("publish_ready", "false");
    console.log(
      [
        `Skipping initial publish bootstrap for ${packageName}.`,
        "The package does not exist on npm yet and NPM_TOKEN is not configured.",
        "Add a one-time NPM_TOKEN repository secret to publish the first version, then configure trusted publishing.",
      ].join(" "),
    );
    return;
  } else {
    await writeGithubOutput("publish_ready", "false");
    console.error(
      [
        `Initial publish bootstrap required for ${packageName}.`,
        "npm trusted publishing cannot publish a never-before-published package yet.",
        "Provide a one-time NPM_TOKEN secret for the first release, then configure trusted publishing and remove the token.",
      ].join(" "),
    );
    process.exit(1);
  }

  const child = spawn("npx", ["semantic-release", ...process.argv.slice(2)], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
