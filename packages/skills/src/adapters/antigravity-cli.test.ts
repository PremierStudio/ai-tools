import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SkillDefinition } from "../types/index.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { AntigravityCliSkillAdapter } from "./antigravity-cli.js";

describe("AntigravityCliSkillAdapter", () => {
  let adapter: AntigravityCliSkillAdapter;

  const testSkill: SkillDefinition = {
    id: "review",
    name: "Review",
    description: "Review code changes.",
    content: "Review correctness, security, and missing tests.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AntigravityCliSkillAdapter();
  });

  it("targets Antigravity workspace skills", () => {
    expect(adapter.id).toBe("antigravity-cli");
    expect(adapter.name).toBe("Antigravity CLI");
    expect(adapter.configDir).toBe(".agents/skills");
    expect(adapter.command).toBe("antigravity");
  });

  it("generates open agent skill folders under .agents/skills", async () => {
    const files = await adapter.generate([testSkill]);

    expect(files).toEqual([
      {
        path: ".agents/skills/review/SKILL.md",
        format: "md",
        content: expect.stringContaining("name: review"),
      },
    ]);
    expect(files[0]!.content).toContain("description: Review code changes.");
    expect(files[0]!.content).toContain("Review correctness, security, and missing tests.");
  });

  it("imports skills from SKILL.md folders", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdir).mockResolvedValue(["review"] as unknown as never);
    vi.mocked(readFile).mockResolvedValue(
      "---\nname: review\ndescription: Review code.\n---\n\nReview carefully.\n",
    );

    const skills = await adapter.import("/project");

    expect(skills).toEqual([
      {
        id: "review",
        name: "review",
        description: "Review code.",
        content: "Review carefully.",
      },
    ]);
  });
});
