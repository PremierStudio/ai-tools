import * as p from "@clack/prompts";
import { registry } from "@premierstudio/ai-hooks/adapters";
import { loadAuth, isTokenExpired } from "../auth/token-store.js";
import { hasPlannableConfig } from "../config/ai-hooks-config.js";
import { hasMcpEntry } from "../config/mcp-config.js";

export async function statusCommand(): Promise<void> {
  p.intro("Plannable — Status");

  // Check authentication
  const auth = await loadAuth();
  if (!auth) {
    p.log.warn("Not authenticated. Run `npx @premierstudio/plannable setup` to connect.");
    p.outro("");
    return;
  }

  const expired = isTokenExpired(auth);
  const authStatus = expired
    ? "\x1b[33mexpired (will refresh on next use)\x1b[0m"
    : "\x1b[32mactive\x1b[0m";

  p.log.info(`Server:     ${auth.server_url}`);
  p.log.info(`Auth:       ${authStatus}`);
  p.log.info(`Scopes:     ${auth.scopes.join(", ") || "none"}`);

  // Check config file
  const hasConfig = hasPlannableConfig();
  p.log.info(
    `Config:     ${hasConfig ? "\x1b[32mai-hooks.config.ts (Plannable)\x1b[0m" : "\x1b[90mnot found\x1b[0m"}`,
  );

  // Check tools
  p.log.info("");
  p.log.info("AI Tools:");

  const detected = await registry.detectAll();
  const allIds = registry.list();

  for (const id of allIds) {
    const adapter = registry.get(id);
    if (!adapter) continue;

    const isDetected = detected.some((d) => d.id === id);
    const hasMcp = hasMcpEntry(adapter);

    let status: string;
    if (isDetected && hasMcp) {
      status = "\x1b[32mconnected\x1b[0m";
    } else if (isDetected) {
      status = "\x1b[33mdetected (no MCP)\x1b[0m";
    } else {
      status = "\x1b[90mnot detected\x1b[0m";
    }

    p.log.info(`  ${adapter.name.padEnd(20)} ${status}`);
  }

  p.outro("");
}
