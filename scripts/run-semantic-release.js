#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

export async function isNpmTokenValid(token, fetchImpl = fetch) {
  const response = await fetchImpl("https://registry.npmjs.org/-/whoami", {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    return true;
  }

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  throw new Error(`Failed to verify npm token: ${response.status} ${response.statusText}`);
}

export function resolveReleaseMode({
  hasOidcContext,
  packageExists,
  hasNpmToken,
  npmTokenValid,
  allowMissingInitialNpmToken,
}) {
  if (hasOidcContext) {
    return { mode: "publish-oidc", publishReady: true };
  }

  if (packageExists) {
    return { mode: "publish-tokenless-existing-package", publishReady: true };
  }

  if (hasNpmToken && npmTokenValid) {
    return { mode: "bootstrap-token", publishReady: true };
  }

  if (allowMissingInitialNpmToken) {
    return {
      mode: "skip-initial-publish",
      publishReady: false,
      reason: hasNpmToken ? "invalid-token" : "missing-token",
    };
  }

  return {
    mode: "fail-initial-publish",
    publishReady: false,
    reason: hasNpmToken ? "invalid-token" : "missing-token",
  };
}

export function sanitizeTokenlessReleaseEnv(env) {
  const releaseEnv = { ...env };
  delete releaseEnv.NPM_TOKEN;
  delete releaseEnv.NODE_AUTH_TOKEN;
  delete releaseEnv.NPM_CONFIG_USERCONFIG;
  return releaseEnv;
}

async function main() {
  let env = { ...process.env };
  const packageName = await loadPackageName();
  const hasOidcContext = Boolean(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
  const packageExists = hasOidcContext ? false : await packageExistsOnNpm(packageName);
  const hasNpmToken = Boolean(env.NPM_TOKEN);
  const npmTokenValid = !hasOidcContext && hasNpmToken ? await isNpmTokenValid(env.NPM_TOKEN) : false;
  const releaseMode = resolveReleaseMode({
    hasOidcContext,
    packageExists,
    hasNpmToken,
    npmTokenValid,
    allowMissingInitialNpmToken: env.ALLOW_MISSING_INITIAL_NPM_TOKEN === "true",
  });

  if (releaseMode.publishReady) {
    await writeGithubOutput("publish_ready", "true");
  } else {
    await writeGithubOutput("publish_ready", "false");
  }

  if (releaseMode.mode === "publish-oidc") {
    // Avoid stale tokens interfering with OIDC-based publish verification.
    env = sanitizeTokenlessReleaseEnv(env);
    console.log(`Publishing ${packageName} with npm trusted publishing (OIDC).`);
  } else if (releaseMode.mode === "publish-tokenless-existing-package") {
    // Avoid stale tokens interfering with npm's tokenless auth checks.
    env = sanitizeTokenlessReleaseEnv(env);
    console.log(`Publishing existing ${packageName} package without a long-lived npm token.`);
  } else if (releaseMode.mode === "bootstrap-token") {
    console.log(
      `Bootstrapping first publish for ${packageName} with NPM_TOKEN because npm trusted publishing cannot create an initial package version yet.`,
    );
  } else if (releaseMode.mode === "skip-initial-publish") {
    const tokenMessage =
      releaseMode.reason === "invalid-token"
        ? "NPM_TOKEN is configured but npm rejected it."
        : "NPM_TOKEN is not configured.";
    console.log(
      [
        `Skipping initial publish bootstrap for ${packageName}.`,
        `The package does not exist on npm yet and ${tokenMessage}`,
        "Add a one-time NPM_TOKEN repository secret to publish the first version, then configure trusted publishing.",
      ].join(" "),
    );
    return;
  } else {
    const tokenMessage =
      releaseMode.reason === "invalid-token"
        ? "The configured NPM_TOKEN is invalid."
        : "NPM_TOKEN is missing.";
    console.error(
      [
        `Initial publish bootstrap required for ${packageName}.`,
        "npm trusted publishing cannot publish a never-before-published package yet.",
        tokenMessage,
        "Provide a valid one-time NPM_TOKEN secret for the first release, then configure trusted publishing and remove the token.",
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
