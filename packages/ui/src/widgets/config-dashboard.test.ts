import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

vi.mock("node:path", () => ({
  resolve: (...args: string[]) => args.join("/"),
}));

import { getEngineStatus, formatEngineRow } from "./config-dashboard.js";
import type { EngineStatus } from "./config-dashboard.js";
import { existsSync } from "node:fs";

beforeEach(() => {
  vi.clearAllMocks();
});

// -- getEngineStatus --

describe("getEngineStatus()", () => {
  it("returns status for all 5 engines", async () => {
    const statuses = await getEngineStatus();
    expect(statuses).toHaveLength(5);
    const engines = statuses.map((s) => s.engine);
    expect(engines).toContain("hooks");
    expect(engines).toContain("mcp");
    expect(engines).toContain("skills");
    expect(engines).toContain("agents");
    expect(engines).toContain("rules");
  });

  it("marks engines as not configured when no config files exist", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const statuses = await getEngineStatus();
    for (const status of statuses) {
      expect(status.configured).toBe(false);
      expect(status.detected).toBe(false);
    }
  });

  it("marks engine as configured when .ts config exists", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      return typeof path === "string" && path.includes("ai-hooks.config.ts");
    });

    const statuses = await getEngineStatus();
    const hooks = statuses.find((s) => s.engine === "hooks");
    expect(hooks?.configured).toBe(true);
    expect(hooks?.detected).toBe(true);
  });

  it("marks engine as configured when .js config exists", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      return typeof path === "string" && path.includes("ai-mcp.config.js");
    });

    const statuses = await getEngineStatus();
    const mcp = statuses.find((s) => s.engine === "mcp");
    expect(mcp?.configured).toBe(true);
  });

  it("detects multiple configured engines", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      return (
        (typeof path === "string" && path.includes("ai-hooks.config.ts")) ||
        (typeof path === "string" && path.includes("ai-skills.config.ts"))
      );
    });

    const statuses = await getEngineStatus();
    const configured = statuses.filter((s) => s.configured);
    expect(configured).toHaveLength(2);
  });
});

// -- formatEngineRow --

describe("formatEngineRow()", () => {
  it("formats configured engine with checkmark", () => {
    const status: EngineStatus = { engine: "hooks", detected: true, configured: true };
    const row = formatEngineRow("hooks", status);
    expect(row).toContain("\u2713");
    expect(row).toContain("hooks");
    expect(row).toContain("configured");
  });

  it("formats unconfigured engine with cross", () => {
    const status: EngineStatus = { engine: "mcp", detected: false, configured: false };
    const row = formatEngineRow("mcp", status);
    expect(row).toContain("\u2717");
    expect(row).toContain("mcp");
    expect(row).toContain("not configured");
  });

  it("includes error message when present", () => {
    const status: EngineStatus = {
      engine: "rules",
      detected: false,
      configured: false,
      error: "file corrupted",
    };
    const row = formatEngineRow("rules", status);
    expect(row).toContain("file corrupted");
  });

  it("omits error when not present", () => {
    const status: EngineStatus = { engine: "agents", detected: true, configured: true };
    const row = formatEngineRow("agents", status);
    expect(row).not.toContain("(");
  });
});
