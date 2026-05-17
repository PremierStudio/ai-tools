import type { ToolInfo, UiKit } from "../types.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  dimColor,
  getIconChar,
  getToolIcon,
  getToolColor,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";
import { fitText, renderEmptyState, resolveHints, resolveKeyHint } from "./utils.js";

export type ToolsViewState = {
  tools: ToolInfo[];
  selectedToolIndex: number;
  loadingTools: boolean;
  runningTools: Array<{ toolId: string; pid: number; startedAt: string }>;
  embeddedToolIds?: string[];
  keyOverrides: Record<string, string>;
};

const TOOL_NAME_WIDTH = 18;
const TOOL_STATUS_WIDTH = 20;
const TOOL_SESSION_WIDTH = 14;
const TOOL_COMMAND_MIN_WIDTH = 22;

function statusLabel(status: ToolInfo["status"], running: boolean, embedded: boolean): string {
  if (embedded) return `${getIconChar("tool.opencode")} embedded`;
  if (running) return `${getIconChar("status.running")} running`;
  switch (status) {
    case "available":
      return `${getIconChar("status.active")} ready`;
    case "running":
      return `${getIconChar("status.running")} running`;
    case "stopped":
      return `${getIconChar("status.stopped")} stopped`;
    case "not-installed":
      return `${getIconChar("status.error")} not installed`;
  }
}

export function renderToolsView<T>(ui: UiKit<T>, state: ToolsViewState): T {
  const killKey = resolveKeyHint("tools-kill", state.keyOverrides, "d");
  const title = `  ${getIconChar("nav.tools")} Tools  [Enter:Launch  Shift+Enter:Embed  ${killKey}:Kill  j/k:Select]  `;

  if (state.loadingTools) {
    return ui.box({ ...PRESETS.content, title, style: { bg: SURFACE.base } }, [
      ui.spinner({ variant: "dots", label: "  Scanning for AI tools..." }),
    ]);
  }

  if (state.tools.length === 0) {
    return ui.box({ ...PRESETS.content, title, style: { bg: SURFACE.base } }, [
      renderEmptyState(ui, getIconChar("nav.tools"), "No tools detected", [
        { text: "Install an AI coding tool such as Claude Code, Codex, or Cursor." },
        {
          spans: [
            { text: "Press ", style: { fg: TEXT.tertiary } },
            { text: "4", style: { fg: BRAND.accent, bold: true } },
            { text: " to switch to Config and check engine status.", style: { fg: TEXT.tertiary } },
          ],
        },
      ]),
    ]);
  }

  const embeddedSet = new Set(state.embeddedToolIds ?? []);
  const runningCount = state.runningTools.length;
  const readyCount = state.tools.filter((t) => t.status === "available").length;
  const commandWidth = Math.max(TOOL_COMMAND_MIN_WIDTH, (process.stdout.columns ?? 120) - 80);

  const summary = ui.richText([
    { text: `${state.tools.length} tools`, style: { fg: TEXT.secondary } },
    { text: "  |  ", style: { fg: TEXT.tertiary } },
    { text: `${readyCount} ready`, style: { fg: TEXT.secondary } },
    { text: "  |  ", style: { fg: TEXT.tertiary } },
    { text: `${runningCount} running`, style: { fg: TEXT.secondary } },
  ]);

  const toolRows = state.tools.map((tool, index) => {
    const selected = index === state.selectedToolIndex;
    const running = state.runningTools.some((r) => r.toolId === tool.id);
    const embedded = embeddedSet.has(tool.id);
    const notInstalled = tool.status === "not-installed";

    const brand = getToolColor(tool.id);
    const icon = getIconChar(getToolIcon(tool.id));
    const mutedBrand = dimColor(brand, 0.6);
    const name = fitText(tool.name, TOOL_NAME_WIDTH).padEnd(TOOL_NAME_WIDTH);
    const status = fitText(
      statusLabel(tool.status, running || embedded, embedded),
      TOOL_STATUS_WIDTH,
    ).padEnd(TOOL_STATUS_WIDTH);
    const sessionText =
      tool.sessionCount > 0
        ? `${tool.sessionCount} session${tool.sessionCount !== 1 ? "s" : ""}`
        : "-";
    const sessions = fitText(sessionText, TOOL_SESSION_WIDTH).padEnd(TOOL_SESSION_WIDTH);
    const command = fitText(tool.command, commandWidth);

    const row = ui.richText([
      {
        text: selected ? "▸ " : "  ",
        style: { fg: selected ? BRAND.accent : TEXT.tertiary, bold: selected },
      },
      { text: `${icon} `, style: { fg: selected ? brand : mutedBrand, bold: selected } },
      {
        text: name,
        style: {
          fg: notInstalled ? TEXT.tertiary : TEXT.primary,
          bold: selected,
          dim: notInstalled,
        },
      },
      { text: "  ", style: {} },
      {
        text: status,
        style: {
          fg:
            running || embedded
              ? STATUS.info
              : tool.status === "not-installed"
                ? STATUS.error
                : STATUS.success,
          bold: selected,
        },
      },
      { text: "  ", style: {} },
      { text: sessions, style: { fg: TEXT.secondary } },
      { text: "  ", style: {} },
      { text: command, style: { fg: TEXT.tertiary, italic: true } },
    ]);

    return ui.box(
      {
        border: "none",
        px: PADDING.component,
        py: PADDING.compact,
      },
      [row],
    );
  });

  return ui.box(
    {
      border: PRESETS.content.border,
      title,
      flex: 1,
      p: PADDING.card,
      style: { bg: SURFACE.base },
    },
    [ui.column({ gap: GAP.tight }, [summary, ui.divider({ char: "-" }), ...toolRows])],
  );
}

export function getToolsKeyHints(overrides: Record<string, string>): string {
  const hints = resolveHints(
    [
      ["tools-launch", "Launch", "Enter"],
      ["tools-kill", "Kill", "d"],
    ],
    overrides,
  );
  return [
    ...hints.map(([k, l]) => `${k}:${l}`),
    "Shift+Enter:Embed",
    "j/k:Select",
    "Esc:Settings",
  ].join("  ");
}
