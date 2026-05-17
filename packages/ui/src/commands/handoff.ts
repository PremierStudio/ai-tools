import type { SessionContext } from "@premierstudio/ai-tools-sessions";
import { extractHandoffContext, previewHandoff } from "../widgets/handoff-panel.js";

/**
 * Tool launch commands for handoff.
 */
const LAUNCH_COMMANDS: Record<string, { command: string; promptFlag: string }> = {
  claude: { command: "claude", promptFlag: "--prompt" },
  codex: { command: "codex", promptFlag: "--prompt" },
  gemini: { command: "gemini", promptFlag: "" },
  opencode: { command: "opencode", promptFlag: "" },
};

export type HandoffResult = {
  context: SessionContext;
  preview: string;
  launchCommand: string | null;
  launchArgs: string[];
};

/**
 * Perform a full handoff: find session, extract context, format preview,
 * and optionally build a launch command for the target tool.
 */
export async function performHandoff(
  sessionId: string,
  targetTool?: string,
): Promise<HandoffResult | null> {
  const context = await extractHandoffContext(sessionId);
  if (!context) return null;

  const preview = previewHandoff(context);

  let launchCommand: string | null = null;
  const launchArgs: string[] = [];

  if (targetTool) {
    const target = LAUNCH_COMMANDS[targetTool];
    if (target) {
      launchCommand = target.command;
      if (target.promptFlag) {
        launchArgs.push(target.promptFlag, context.handoffMarkdown);
      }
    }
  }

  return {
    context,
    preview,
    launchCommand,
    launchArgs,
  };
}
