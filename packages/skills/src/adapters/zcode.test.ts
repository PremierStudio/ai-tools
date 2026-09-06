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
import { ZcodeSkillAdapter } from "./zcode.js";

describe("ZcodeSkillAdapter", () => {
  let adapter: ZcodeSkillAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ZcodeSkillAdapter();
  });

  it("writes SKILL.md directories", async () => {
    expect(adapter.id).toBe("zcode");
    expect(adapter.configDir).toBe(".zcode/skills");
    const files = await adapter.generate([{ id: "ship", name: "ship", content: "Ship it." }]);
    expect(files[0]?.path).toBe(".zcode/skills/ship/SKILL.md");
    expect(files[0]?.content).toContain("name: ship");
  });

  it("imports SKILL.md directories", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdir).mockResolvedValue([{ name: "ship", isDirectory: () => true }] as never);
    vi.mocked(readFile).mockResolvedValue("---\nname: ship\ndescription: ship\n---\n\nShip it.\n");
    const skills = await adapter.import("/tmp/proj");
    expect(skills[0]?.id).toBe("ship");
    expect(skills[0]?.content).toBe("Ship it.");
  });
});
