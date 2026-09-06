import { describe, expect, it } from "vitest";
import { auditServers } from "./audit.js";
import type { MCPServerDefinition } from "./types/index.js";

describe("auditServers", () => {
  it("flags interactive op-run-palamhealth but not the service-account wrapper", () => {
    const interactive: MCPServerDefinition = {
      id: "outline",
      name: "outline",
      transport: {
        type: "stdio",
        command: "/home/blitz/.local/bin/op-run-palamhealth",
        args: ["npx", "mcp-remote", "https://docs.palamhealth.dev/mcp"],
      },
    };
    const headless: MCPServerDefinition = {
      id: "outline-sa",
      name: "outline-sa",
      transport: {
        type: "stdio",
        command: "/home/blitz/.local/bin/op-run-palamhealth-sa",
        args: ["npx"],
      },
    };
    const findings = [
      ...auditServers("cursor", [interactive], "user"),
      ...auditServers("cursor", [headless], "user"),
    ];
    expect(findings.some((f) => f.kind === "interactive-palamhealth-account")).toBe(true);
    expect(
      findings.filter(
        (f) => f.server === "outline-sa" && f.kind === "interactive-palamhealth-account",
      ),
    ).toEqual([]);
  });

  it("flags PalamHealth servers in user-global configs, not project configs", () => {
    const palam: MCPServerDefinition = {
      id: "palamhealth",
      name: "palamhealth",
      transport: { type: "stdio", command: "/home/blitz/.local/bin/palamhealth-mcp-stdio" },
    };
    expect(auditServers("zcode", [palam], "user").map((f) => f.kind)).toContain(
      "palamhealth-in-user-config",
    );
    expect(auditServers("zcode", [palam], "project").map((f) => f.kind)).not.toContain(
      "palamhealth-in-user-config",
    );
  });

  it("flags PalamHealth Linear registered as generic linear", () => {
    const linear: MCPServerDefinition = {
      id: "linear",
      name: "linear",
      transport: { type: "stdio", command: "/home/blitz/.local/bin/linear-mcp-palamhealth" },
    };
    expect(auditServers("cursor", [linear], "user").map((f) => f.kind)).toContain(
      "misnamed-palamhealth-linear",
    );
  });

  it("flags OP_ACCOUNT=palamhealth.1password.com", () => {
    const server: MCPServerDefinition = {
      id: "linear-palamhealth",
      name: "linear-palamhealth",
      transport: {
        type: "stdio",
        command: "/home/blitz/.local/bin/op-run-palamhealth",
        env: { OP_ACCOUNT: "palamhealth.1password.com" },
      },
    };
    const kinds = auditServers("zcode", [server], "user").map((f) => f.kind);
    expect(kinds).toContain("interactive-palamhealth-account");
    expect(kinds).toContain("palamhealth-in-user-config");
  });
});
