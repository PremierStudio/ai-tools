import * as p from "@clack/prompts";
import { registry } from "@premierstudio/ai-hooks/adapters";
import type { Adapter } from "@premierstudio/ai-hooks";
import { showBanner } from "../ui/brand.js";
import {
  askToolSelection,
  askLanguageConfirm,
  askFeatureToggles,
  askMcpScope,
} from "../ui/prompts.js";
import { login } from "../auth/oauth.js";
import { detectLanguage } from "../detect/language.js";
import { installMcpEntry } from "../config/mcp-config.js";
import type { McpScope } from "../config/mcp-config.js";
import { writeConfig } from "../config/ai-hooks-config.js";

export async function setupCommand(serverUrl: string): Promise<void> {
  showBanner("0.1.0");

  p.log.info(`Server: ${serverUrl}`);

  // Step 2: OAuth login
  const auth = await login(serverUrl);
  p.log.success("Authenticated to Plannable");

  // Step 3: Detect AI tools
  const spin = p.spinner();
  spin.start("Detecting AI coding tools...");

  const detected = await registry.detectAll();
  const allIds = registry.list();
  const allAdapters: Array<{ id: string; name: string }> = [];
  for (const id of allIds) {
    const adapter = registry.get(id);
    if (adapter) {
      allAdapters.push({ id: adapter.id, name: adapter.name });
    }
  }

  spin.stop(`Found ${detected.length} AI tool(s)`);

  // Step 4: Tool selection
  const selectedIds = await askToolSelection(
    detected.map((d) => ({ id: d.id, name: d.name })),
    allAdapters,
  );

  // Step 5: MCP scope (global vs project)
  const mcpScope: McpScope = await askMcpScope();

  // Step 6: Language detection
  const langResult = await detectLanguage();
  const language = await askLanguageConfirm(langResult.primaryLanguage);

  if (langResult.frameworks.length > 0) {
    p.log.info(`Frameworks detected: ${langResult.frameworks.join(", ")}`);
  }

  // Step 7: Feature toggles
  const features = await askFeatureToggles();

  // Step 8: Install
  const installSpin = p.spinner();
  installSpin.start("Generating configuration...");

  // Generate ai-hooks.config.ts (always project-level)
  const configPath = await writeConfig(language, features);

  // Install MCP entries for each selected tool
  const installedTools: string[] = [];
  const mcpPaths: string[] = [];

  for (const id of selectedIds) {
    const adapter: Adapter | undefined = registry.get(id);
    if (!adapter) continue;

    // Generate and install ai-hooks configs
    try {
      const { loadConfig } = await import("@premierstudio/ai-hooks");
      const config = await loadConfig(configPath);
      const configs = await adapter.generate(config.hooks);
      await adapter.install(configs);
    } catch {
      // Some adapters may not support hook generation
    }

    // Install MCP entry
    const mcpPath = await installMcpEntry(
      adapter,
      `${serverUrl}/api/mcp`,
      auth.access_token,
      mcpScope,
    );
    if (mcpPath) {
      mcpPaths.push(mcpPath);
    }

    installedTools.push(adapter.name);
  }

  installSpin.stop("Configuration complete");

  // Step 9: Summary
  const dim = "\x1b[2m";
  const r = "\x1b[0m";
  const i4 = "\x1b[38;2;129;140;248m";
  const scopeLabel = mcpScope === "global" ? "global" : "project";

  p.log.success(`${i4}Plannable is connected${r}`);

  const summary = [
    `  ${dim}tools${r}     ${installedTools.join(", ")}`,
    `  ${dim}scope${r}     ${scopeLabel}`,
    `  ${dim}language${r}  ${language}`,
    `  ${dim}config${r}    ${configPath}`,
    "",
    `  ${dim}1.${r} Restart your AI tool to pick up the MCP connection`,
    `  ${dim}2.${r} ${serverUrl}/dashboard`,
    `  ${dim}3.${r} ${dim}npx plannable status${r}`,
  ].join("\n");
  p.log.message(summary);

  p.outro("");
}
