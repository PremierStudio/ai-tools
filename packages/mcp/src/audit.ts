import type { MCPServerDefinition } from "./types/index.js";

export type AuditKind =
  | "interactive-palamhealth-account"
  | "palamhealth-in-user-config"
  | "misnamed-palamhealth-linear";

export type AuditFinding = {
  tool: string;
  server: string;
  kind: AuditKind;
  detail: string;
};

const INTERACTIVE_WRAPPER = "op-run-palamhealth";
const PALAMHEALTH_ACCOUNT = "palamhealth.1password.com";
const PALAMHEALTH_LINEAR = "linear-mcp-palamhealth";
const PALAMHEALTH_IDS = new Set(["palamhealth", "outline", "linear-palamhealth"]);

export function auditServers(
  tool: string,
  servers: MCPServerDefinition[],
  source: "user" | "project" = "user",
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const server of servers) {
    const command = server.transport.type === "stdio" ? server.transport.command : "";
    const env = server.transport.type === "stdio" ? (server.transport.env ?? {}) : {};
    const usesSa = command.endsWith("op-run-palamhealth-sa") || command === "op-run-palamhealth-sa";
    const usesInteractive =
      !usesSa && (command.endsWith(`/${INTERACTIVE_WRAPPER}`) || command === INTERACTIVE_WRAPPER);
    if (usesInteractive || env.OP_ACCOUNT === PALAMHEALTH_ACCOUNT) {
      findings.push({
        tool,
        server: server.id,
        kind: "interactive-palamhealth-account",
        detail: `${server.id} uses interactive PalamHealth 1Password (${INTERACTIVE_WRAPPER} or OP_ACCOUNT=${PALAMHEALTH_ACCOUNT})`,
      });
    }

    const url = "url" in server.transport ? server.transport.url : "";
    const isPalamProduct =
      PALAMHEALTH_IDS.has(server.id) ||
      url.includes("palamhealth.dev") ||
      command.includes("palamhealth-mcp") ||
      command.includes(PALAMHEALTH_LINEAR);
    if (source === "user" && isPalamProduct) {
      findings.push({
        tool,
        server: server.id,
        kind: "palamhealth-in-user-config",
        detail: `${server.id} looks like PalamHealth MCP in a global/user config`,
      });
    }

    if (server.id === "linear" && command.includes(PALAMHEALTH_LINEAR)) {
      findings.push({
        tool,
        server: server.id,
        kind: "misnamed-palamhealth-linear",
        detail: "PalamHealth Linear is registered as generic id `linear`",
      });
    }
  }
  return findings;
}
