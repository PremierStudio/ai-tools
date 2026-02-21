import { spawn } from "node:child_process";
import type { SessionContext } from "../types/index.js";
import { formatHandoffMarkdown } from "./markdown.js";

/**
 * Tool command mappings for launching with context.
 */
const TOOL_COMMANDS: Record<string, { command: string; promptFlag: string }> = {
  claude: { command: "claude", promptFlag: "--prompt" },
  codex: { command: "codex", promptFlag: "--prompt" },
  gemini: { command: "gemini", promptFlag: "" },
  opencode: { command: "opencode", promptFlag: "" },
};

/**
 * Launch a tool with handoff context.
 */
export function launchWithContext(
  tool: string,
  context: SessionContext,
): { command: string; args: string[] } | null {
  const toolConfig = TOOL_COMMANDS[tool];
  if (!toolConfig) return null;

  const markdown = formatHandoffMarkdown(context);
  const args: string[] = [];
  if (toolConfig.promptFlag) {
    args.push(toolConfig.promptFlag, markdown);
  }

  return { command: toolConfig.command, args };
}

/**
 * Spawn a tool process with handoff context.
 */
export function spawnTool(
  command: string,
  args: string[],
  options?: { cwd?: string },
): ReturnType<typeof spawn> {
  return spawn(command, args, {
    stdio: "inherit",
    cwd: options?.cwd,
  });
}
