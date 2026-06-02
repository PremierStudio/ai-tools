import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadPluginConfig } from "./load-config.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadPluginConfig", () => {
  it("throws when the config file is missing", async () => {
    await expect(loadPluginConfig("/tmp/ai-tools-missing-plugin-config.mjs")).rejects.toThrow(
      "Plugin config not found",
    );
  });

  it("loads the default export from an existing config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ai-tools-plugin-config-"));
    tempDirs.push(dir);
    const configPath = join(dir, "ai-plugin.config.mjs");
    await writeFile(
      configPath,
      [
        "export default {",
        '  id: "release-confidence",',
        '  name: "Release Confidence",',
        '  version: "0.1.0",',
        "};",
      ].join("\n"),
      "utf-8",
    );

    const config = await loadPluginConfig(configPath);

    expect(config).toMatchObject({
      id: "release-confidence",
      name: "Release Confidence",
      version: "0.1.0",
    });
  });
});
