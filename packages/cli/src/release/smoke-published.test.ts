import { describe, expect, it, vi } from "vitest";
import {
  isPublishedHelpHealthy,
  PUBLISHED_HELP_MARKER,
  smokePublished,
} from "../../../../scripts/smoke-published.mjs";
import { run as runCli } from "../cli/index.js";

describe("published help marker", () => {
  it("matches the live CLI help string", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await runCli(["help"]);
    } finally {
      console.log = original;
    }
    const help = lines.join("\n");
    expect(help).toMatch(PUBLISHED_HELP_MARKER);
    expect(isPublishedHelpHealthy(0, help)).toBe(true);
    expect(isPublishedHelpHealthy(1, help)).toBe(false);
    expect(isPublishedHelpHealthy(0, "npx: command not found")).toBe(false);
  });
});

describe("smokePublished", () => {
  it("retries, prints the failing output, then succeeds", async () => {
    const logs: string[] = [];
    const runHelp = vi
      .fn()
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "E404 Not Found" })
      .mockReturnValueOnce({
        status: 0,
        stdout: "ai-tools - Unified CLI for ai-tools engines\n",
        stderr: "",
      });

    const code = await smokePublished({
      maxAttempts: 3,
      waitMs: 1,
      runHelp,
      sleep: () => undefined,
      log: (line) => logs.push(String(line)),
      error: (line) => logs.push(String(line)),
    });

    expect(code).toBe(0);
    expect(runHelp).toHaveBeenCalledTimes(2);
    expect(logs.join("\n")).toContain("E404 Not Found");
    expect(logs.join("\n")).toContain("ai-tools published smoke passed");
  });

  it("exits 1 after logging every failed attempt", async () => {
    const logs: string[] = [];
    const code = await smokePublished({
      maxAttempts: 2,
      waitMs: 1,
      runHelp: () => ({ status: 1, stdout: "", stderr: "network timeout" }),
      sleep: () => undefined,
      log: (line) => logs.push(String(line)),
      error: (line) => logs.push(String(line)),
    });

    expect(code).toBe(1);
    expect(logs.filter((line) => line.includes("network timeout"))).toHaveLength(2);
    expect(logs.at(-1)).toBe("ai-tools published smoke failed after retries");
  });
});
