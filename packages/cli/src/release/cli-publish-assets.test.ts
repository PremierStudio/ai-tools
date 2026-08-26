import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { stageCliPublishAssets } from "../../../../scripts/cli-publish-assets.js";

function makeRepo(readme: string): string {
  const root = mkdtempSync(join(tmpdir(), "cli-readme-"));
  mkdirSync(join(root, "packages", "cli"), { recursive: true });
  writeFileSync(join(root, "README.md"), readme);
  return root;
}

describe("stageCliPublishAssets", () => {
  it("copies the repo README into packages/cli so npm pack has a package readme", () => {
    const root = makeRepo("# ai-tools\n\nGet started with the CLI.\n");

    stageCliPublishAssets(root);

    expect(readFileSync(join(root, "packages", "cli", "README.md"), "utf8")).toBe(
      "# ai-tools\n\nGet started with the CLI.\n",
    );
    rmSync(root, { recursive: true, force: true });
  });

  it("fails when the repo README is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "cli-readme-missing-"));
    mkdirSync(join(root, "packages", "cli"), { recursive: true });

    expect(() => stageCliPublishAssets(root)).toThrow(/README\.md/);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("published CLI README", () => {
  it("keeps a CLI README on disk so npm records it on publish", () => {
    const repo = resolve(import.meta.dirname, "../../../..");
    expect(readFileSync(join(repo, "packages", "cli", "README.md"), "utf8")).toBe(
      readFileSync(join(repo, "README.md"), "utf8"),
    );
  });
});
