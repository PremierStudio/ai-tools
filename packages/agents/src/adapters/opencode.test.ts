import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentDefinition } from "../types/index.js";

vi.mock("./index.js", () => {
  const registry = { register: vi.fn() };
  abstract class BaseAgentAdapter {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly nativeSupport: boolean;
    abstract readonly configDir: string;
    abstract generate(agents: AgentDefinition[]): Promise<unknown[]>;
    abstract import(cwd?: string): Promise<AgentDefinition[]>;
    async detect() {
      return false;
    }
    async install() {}
    async uninstall() {}
  }
  return { BaseAgentAdapter, registry };
});

import { OpenCodeAgentAdapter } from "./opencode.js";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "ai-tools-agents-opencode-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("OpenCodeAgentAdapter", () => {
  let adapter: OpenCodeAgentAdapter;

  const testAgent: AgentDefinition = {
    id: "reviewer",
    name: "Code Reviewer",
    description: "Reviews code",
    instructions: "Review carefully.",
  };

  beforeEach(() => {
    adapter = new OpenCodeAgentAdapter();
  });

  describe("metadata", () => {
    it("has correct id", () => {
      expect(adapter.id).toBe("opencode");
    });

    it("has correct name", () => {
      expect(adapter.name).toBe("OpenCode");
    });

    it("has native support", () => {
      expect(adapter.nativeSupport).toBe(true);
    });

    it("has correct configDir", () => {
      // Live OpenCode dir is agent/ (singular). Observed ~/.config/opencode/agent/crash.md
      // and OpenCode binary docs: `.opencode/agent/<name>.md`.
      expect(adapter.configDir).toBe(".opencode/agent");
    });
  });

  describe("generate", () => {
    it("returns empty array for no agents", async () => {
      const files = await adapter.generate([]);
      expect(files).toEqual([]);
    });

    it("generates file at the live OpenCode agent path", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.path).toBe(".opencode/agent/reviewer.md");
    });

    it("generates file with md format", async () => {
      const files = await adapter.generate([testAgent]);
      expect(files[0]!.format).toBe("md");
    });
  });

  describe("install", () => {
    it("writes markdown into .opencode/agent, not .opencode/agents", async () => {
      await withTempDir(async (dir) => {
        const files = await adapter.generate([testAgent]);
        await adapter.install(files, dir);

        const agentPath = join(dir, ".opencode/agent/reviewer.md");
        expect(existsSync(agentPath)).toBe(true);
        expect(existsSync(join(dir, ".opencode/agents/reviewer.md"))).toBe(false);
        expect(await readFile(agentPath, "utf-8")).toContain("# Code Reviewer");
      });
    });
  });

  describe("import", () => {
    it("returns empty array when config dir does not exist", async () => {
      await withTempDir(async (dir) => {
        expect(await adapter.import(dir)).toEqual([]);
      });
    });

    it("imports without cwd argument", async () => {
      await withTempDir(async (dir) => {
        const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
        try {
          expect(await adapter.import()).toEqual([]);
        } finally {
          cwdSpy.mockRestore();
        }
      });
    });

    it("parses agent from markdown file", async () => {
      await withTempDir(async (dir) => {
        await mkdir(join(dir, ".opencode/agent"), { recursive: true });
        await writeFile(
          join(dir, ".opencode/agent/reviewer.md"),
          "---\ndescription: Reviews code\n---\n\n# Code Reviewer\n\nReview.\n",
        );

        const agents = await adapter.import(dir);
        expect(agents).toHaveLength(1);
        expect(agents[0]!.id).toBe("reviewer");
        expect(agents[0]!.name).toBe("Code Reviewer");
      });
    });
  });
});
