import type { SessionContext } from "../types/index.js";

/**
 * Format a session context as handoff markdown.
 */
export function formatHandoffMarkdown(ctx: SessionContext): string {
  const lines = [
    `# Session Handoff`,
    "",
    `> Continuing work from **${ctx.tool}** session: ${ctx.title}`,
    "",
    "## Context",
    "",
    ctx.summary,
    "",
  ];

  if (ctx.keyFiles.length > 0) {
    lines.push("## Relevant Files", "");
    for (const file of ctx.keyFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  if (ctx.keyDecisions.length > 0) {
    lines.push("## Decisions Made", "");
    for (const decision of ctx.keyDecisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  lines.push(
    "## Instructions",
    "",
    "Please continue this work, picking up where the previous session left off.",
    "Review the files and decisions above for context.",
    "",
  );

  return lines.join("\n");
}
