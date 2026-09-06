import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function stageCliPublishAssets(repoRoot) {
  const readmeSource = join(repoRoot, "README.md");
  if (!existsSync(readmeSource)) {
    throw new Error("Missing repo README.md; npm publishes packages/cli and needs a README");
  }

  const cliRoot = join(repoRoot, "packages", "cli");
  mkdirSync(cliRoot, { recursive: true });
  cpSync(readmeSource, join(cliRoot, "README.md"));

  const licenseSource = join(repoRoot, "LICENSE");
  if (existsSync(licenseSource)) {
    cpSync(licenseSource, join(cliRoot, "LICENSE"));
  }
}
