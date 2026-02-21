import { BaseAdapter, registry } from "./index.js";
import type {
  AdapterCapabilities,
  GeneratedConfig,
  HookDefinition,
  HookEventType,
} from "../types/index.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Event mapping: ai-hooks universal events -> Amp native hooks.
 *
 * Amp (Sourcegraph) supports a limited hooks system via amp.hooks
 * settings, with events like "tool:post-execute". However, the hooks
 * API is not yet comprehensive, so this adapter primarily relies on
 * MCP for event delivery and uses the hooks system where available.
 *
 * Reference: https://ampcode.com/manual
 */
const EVENT_MAP: Record<string, string[]> = {
  "session:start": [],
  "session:end": [],
  "prompt:submit": [],
  "prompt:response": [],
  "tool:before": ["tool:pre-execute"],
  "tool:after": ["tool:post-execute"],
  "file:write": ["tool:pre-execute"],
  "file:edit": ["tool:pre-execute"],
  "file:delete": ["tool:pre-execute"],
  "shell:before": ["tool:pre-execute"],
  "shell:after": ["tool:post-execute"],
  "mcp:before": ["tool:pre-execute"],
  "mcp:after": ["tool:post-execute"],
};

const REVERSE_MAP: Record<string, HookEventType[]> = {
  "tool:pre-execute": [
    "tool:before",
    "file:write",
    "file:edit",
    "file:delete",
    "shell:before",
    "mcp:before",
  ],
  "tool:post-execute": ["tool:after", "shell:after", "mcp:after"],
};

/**
 * Amp adapter for ai-hooks.
 *
 * Amp (Sourcegraph) has a growing hooks system and strong MCP support.
 * This adapter generates an MCP server configuration that the ai-hooks
 * MCP server provides, enabling tools management, event emission, and
 * hook control through MCP tool calls.
 *
 * The adapter also generates amp.hooks entries where the native system
 * supports tool pre/post-execute events.
 *
 * Reference: https://ampcode.com/manual
 */
class AmpAdapter extends BaseAdapter {
  readonly id = "amp";
  readonly name = "Amp";
  readonly version = "1.0";

  readonly capabilities: AdapterCapabilities = {
    beforeHooks: false,
    afterHooks: true,
    mcp: true,
    configFile: true,
    supportedEvents: [
      "tool:before",
      "tool:after",
      "file:write",
      "file:edit",
      "file:delete",
      "shell:before",
      "shell:after",
      "mcp:before",
      "mcp:after",
    ],
    blockableEvents: [],
  };

  async detect(): Promise<boolean> {
    const hasCommand = await this.commandExists("amp");
    const hasDir = existsSync(resolve(process.cwd(), ".amp"));
    return hasCommand || hasDir;
  }

  async generate(hooks: HookDefinition[]): Promise<GeneratedConfig[]> {
    const configs: GeneratedConfig[] = [];

    // Generate MCP server configuration for ai-hooks
    const mcpConfig = {
      mcpServers: {
        "ai-hooks": {
          command: "npx",
          args: ["@premierstudio/mcp-server"],
          env: {
            AI_HOOKS_CONFIG: resolve(process.cwd(), "ai-hooks.config.ts"),
          },
        },
      },
    };

    configs.push({
      path: ".amp/mcp.json",
      content: JSON.stringify(mcpConfig, null, 2) + "\n",
      format: "json",
    });

    // If any hooks need tool:pre/post-execute, note which events
    const neededEvents = new Set<string>();
    for (const hook of hooks) {
      for (const event of hook.events) {
        const nativeEvents = this.mapEvent(event);
        for (const ne of nativeEvents) {
          neededEvents.add(ne);
        }
      }
    }

    // Generate a summary of configured hooks for reference
    const hooksList = hooks.map((h) => ({
      id: h.id,
      name: h.name,
      events: h.events,
      phase: h.phase,
      nativeEvents: h.events.flatMap((e) => this.mapEvent(e)),
    }));

    configs.push({
      path: ".amp/ai-hooks-manifest.json",
      content:
        JSON.stringify(
          {
            adapter: "amp",
            version: "1.0",
            hooks: hooksList,
            nativeEvents: [...neededEvents],
            mcpServer: "@premierstudio/mcp-server",
          },
          null,
          2,
        ) + "\n",
      format: "json",
    });

    return configs;
  }

  mapEvent(event: HookEventType): string[] {
    return EVENT_MAP[event] ?? [];
  }

  mapNativeEvent(nativeEvent: string): HookEventType[] {
    return REVERSE_MAP[nativeEvent] ?? [];
  }

  async uninstall(): Promise<void> {
    await this.removeFile(".amp/mcp.json");
    await this.removeFile(".amp/ai-hooks-manifest.json");
  }
}

// Auto-register
const adapter = new AmpAdapter();
registry.register(adapter);

export { AmpAdapter };
export default adapter;
