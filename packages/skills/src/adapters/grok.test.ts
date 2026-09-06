import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry.js", () => ({
  registry: { register: vi.fn() },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { GrokSkillAdapter } from "./grok.js";

describe("GrokSkillAdapter", () => {
  let adapter: GrokSkillAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GrokSkillAdapter();
  });

  it("writes SKILL.md directories Grok actually scans", async () => {
    expect(adapter.id).toBe("grok");
    expect(adapter.configDir).toBe(".grok/skills");
    const files = await adapter.generate([
      {
        id: "commit",
        name: "commit",
        description: "Make commits",
        content: "Use conventional commits.",
      },
    ]);
    expect(files[0]?.path).toBe(".grok/skills/commit/SKILL.md");
    expect(files[0]?.content).toContain("name: commit");
    expect(files[0]?.content).toContain("Use conventional commits.");
  });

  it("imports SKILL.md directories", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdir).mockResolvedValue([{ name: "commit", isDirectory: () => true }] as never);
    vi.mocked(readFile).mockResolvedValue(
      "---\nname: commit\ndescription: Make commits\n---\n\nUse conventional commits.\n",
    );
    const skills = await adapter.import("/tmp/proj");
    expect(skills).toEqual([
      {
        id: "commit",
        name: "commit",
        description: "Make commits",
        content: "Use conventional commits.",
      },
    ]);
  });

  it("returns empty when the skills dir is missing", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(await adapter.import("/tmp/proj")).toEqual([]);
  });
});
