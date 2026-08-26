import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@itz4blitz/ai-tools-sessions", () => ({
  registry: {
    list: () => [],
    get: () => undefined,
    detectAll: async () => [],
  },
}));

vi.mock("@itz4blitz/ai-tools-sessions/adapters/all", () => ({}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  statSync: vi.fn().mockReturnValue({ mtimeMs: Date.now() }),
}));

vi.mock("node:path", () => ({
  resolve: (...args: string[]) => args.join("/"),
}));

import { run, parseFlags } from "./index.js";

let logOutput: string[];
let errorOutput: string[];

const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  logOutput = [];
  errorOutput = [];

  console.log = vi.fn((...args: unknown[]) => {
    logOutput.push(args.map(String).join(" "));
  });
  console.error = vi.fn((...args: unknown[]) => {
    errorOutput.push(args.map(String).join(" "));
  });

  vi.clearAllMocks();
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

function allLog(): string {
  return logOutput.join("\n");
}

// -- parseFlags --

describe("parseFlags()", () => {
  it("parses --help flag", () => {
    const flags = parseFlags(["--help"]);
    expect(flags.help).toBe(true);
    expect(flags.noPty).toBe(false);
    expect(flags.detach).toBe(false);
  });

  it("parses -h flag", () => {
    const flags = parseFlags(["-h"]);
    expect(flags.help).toBe(true);
  });

  it("parses --no-pty flag", () => {
    const flags = parseFlags(["--no-pty"]);
    expect(flags.noPty).toBe(true);
    expect(flags.help).toBe(false);
  });

  it("parses --detach flag", () => {
    const flags = parseFlags(["--detach"]);
    expect(flags.detach).toBe(true);
  });

  it("parses multiple flags", () => {
    const flags = parseFlags(["--no-pty", "--detach"]);
    expect(flags.noPty).toBe(true);
    expect(flags.detach).toBe(true);
  });

  it("returns all false for no flags", () => {
    const flags = parseFlags([]);
    expect(flags.help).toBe(false);
    expect(flags.noPty).toBe(false);
    expect(flags.detach).toBe(false);
  });
});

// -- run() - help output --

describe("run() - help output", () => {
  it("prints help text for --help", async () => {
    await run(["--help"]);
    const output = allLog();
    expect(output).toContain("ai-tools-tui");
    expect(output).toContain("USAGE:");
    expect(output).toContain("OPTIONS:");
    expect(output).toContain("KEYBINDINGS:");
  });

  it("prints help text for -h", async () => {
    await run(["-h"]);
    expect(allLog()).toContain("ai-tools-tui");
  });

  it("help includes --no-pty option", async () => {
    await run(["--help"]);
    expect(allLog()).toContain("--no-pty");
  });

  it("help includes --detach option", async () => {
    await run(["--help"]);
    expect(allLog()).toContain("--detach");
  });
});

// -- run() - no-pty mode --

describe("run() - no-pty mode", () => {
  it("prints dashboard in simple text mode", async () => {
    await run(["--no-pty"]);
    const output = allLog();
    expect(output).toContain("AI Tools Dashboard (no-pty mode)");
    expect(output).toContain("Mode:");
    expect(output).toContain("Config:");
    expect(output).toContain("Sessions:");
    expect(output).toContain("Detected tools:");
  });
});

// -- run() - detach mode --

describe("run() - detach mode", () => {
  it("prints not yet implemented message", async () => {
    await run(["--detach"]);
    expect(allLog()).toContain("not yet implemented");
  });
});

// -- run() - default TUI mode --

describe("run() - default mode", () => {
  it("prints dashboard info", async () => {
    await run([]);
    const output = allLog();
    expect(output).toContain("AI Tools Dashboard");
    expect(output).toContain("Mode:");
    expect(output).toContain("Config:");
    expect(output).toContain("Sessions:");
  });
});
