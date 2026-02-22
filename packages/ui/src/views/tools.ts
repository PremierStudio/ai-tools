import type { ToolInfo, UiKit } from "../types.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  dimColor,
  tintBg,
  getIconChar,
  getToolIcon,
  getToolColor,
  type RgbColor,
  PADDING,
  GAP,
  MARGIN,
  PRESETS,
} from "../theme.js";

export type ToolsViewState = {
  tools: ToolInfo[];
  selectedToolIndex: number;
  loadingTools: boolean;
  runningTools: Array<{ toolId: string; pid: number; startedAt: string }>;
  embeddedToolIds?: string[];
};

function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function statusBadgeVariant(status: ToolInfo["status"], running: boolean): string {
  if (running) return "info";
  switch (status) {
    case "available":
      return "success";
    case "running":
      return "info";
    case "stopped":
      return "warning";
    case "not-installed":
      return "error";
  }
}

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

/**
 * Render tools view with consistent design system
 */
export function renderToolsView<T>(ui: UiKit<T>, state: ToolsViewState): T {
  const title = `  ${getIconChar("nav.tools")} Tools  [Enter:Launch  d:Kill  j/k:Select]  `;

  if (state.loadingTools) {
    return ui.box(
      { ...PRESETS.content, title, style: { bg: SURFACE.base } },
      [ui.spinner({ variant: "dots", label: "  Scanning for AI tools…" })],
    );
  }

  if (state.tools.length === 0) {
    return ui.box(
      { ...PRESETS.content, title, style: { bg: SURFACE.base } },
      [ui.text("No tools detected.", { style: { fg: TEXT.tertiary } })],
    );
  }

  const embeddedSet = new Set(state.embeddedToolIds ?? []);
  const maxSessions = Math.max(1, ...state.tools.map((t) => t.sessionCount));
  const runningCount = state.runningTools.length;
  const readyCount = state.tools.filter((t) => t.status === "available").length;
  const commandWidth = Math.max(28, (process.stdout.columns ?? 120) - 70);

  const summary = ui.richText([
    { text: `${getIconChar("status.active")} `, style: { fg: STATUS.info, bold: true } },
    { text: `${state.tools.length} tools`, style: { fg: TEXT.secondary } },
    { text: "  │  ", style: { fg: TEXT.tertiary } },
    { text: `${getIconChar("status.active")} `, style: { fg: BRAND.base, bold: true } },
    { text: `${readyCount} ready`, style: { fg: TEXT.secondary } },
    { text: "  │  ", style: { fg: TEXT.tertiary } },
    { text: `${getIconChar("status.running")} `, style: { fg: BRAND.accent, bold: true } },
    { text: `${runningCount} running`, style: { fg: TEXT.secondary } },
  ]);

  const cards: T[] = [];

  state.tools.forEach((tool, i) => {
    const selected = i === state.selectedToolIndex;
    const running = state.runningTools.some((r) => r.toolId === tool.id);
    const embedded = embeddedSet.has(tool.id);
    const notInstalled = tool.status === "not-installed";

    const brand = getToolColor(tool.id);
    const icon = getIconChar(getToolIcon(tool.id));
    const dimBrand = dimColor(brand, 0.35);
    const mutedBrand = dimColor(brand, 0.6);

    const cardBg: RgbColor = selected ? tintBg(brand, 0.12) : SURFACE.elevated;
    const gutterColor: RgbColor = notInstalled
      ? TEXT.tertiary
      : selected
        ? brand
        : mutedBrand;

    const nameColor: RgbColor = notInstalled
      ? TEXT.tertiary
      : selected
        ? TEXT.primary
        : TEXT.secondary;
    const cmdColor: RgbColor = TEXT.tertiary;

    const topRow = ui.row({ gap: GAP.standard, justify: "between" }, [
      ui.richText([
        { text: `${getIconChar("powerline.separator")} `, style: { fg: gutterColor, bold: true } },
        { text: icon + " ", style: { fg: selected ? brand : dimBrand, bold: selected } },
        { text: " ", style: {} },
        { text: tool.name, style: { fg: nameColor, bold: selected, dim: notInstalled } },
      ]),
      ui.badge(statusLabel(tool.status, running || embedded, embedded), {
        variant: statusBadgeVariant(tool.status, running || embedded),
      }),
    ]);

    const cmdRow = ui.richText([
      { text: "   ", style: {} },
      { text: fitText(tool.command, commandWidth), style: { fg: cmdColor, italic: true } },
      ...(tool.sessionCount > 0
        ? [
            { text: `  │  ${getIconChar("nav.sessions")} `, style: { fg: selected ? BRAND.accent : brand } },
            {
              text: `${tool.sessionCount} session${tool.sessionCount !== 1 ? "s" : ""}`,
              style: { fg: selected ? BRAND.base : TEXT.secondary },
            },
          ]
        : []),
    ]);

    const rows: T[] = [topRow, cmdRow];
    if (tool.sessionCount > 0) {
      rows.push(
        ui.row({ gap: GAP.standard, pl: 5 }, [
          ui.progress(tool.sessionCount / maxSessions, {
            width: 24,
            variant: "blocks",
            style: { fg: selected ? brand : dimBrand },
            trackStyle: { fg: dimColor(brand, 0.12) },
          }),
        ]),
      );
    }

    cards.push(
      ui.box(
        {
          border: selected ? PRESETS.selectedCard.border : PRESETS.card.border,
          style: selected
            ? { fg: brand, bg: cardBg }
            : { fg: notInstalled ? TEXT.tertiary : mutedBrand, bg: SURFACE.elevated },
          shadow: selected ? PRESETS.selectedCard.shadow : PRESETS.card.shadow,
          p: PADDING.card,
          mb: MARGIN.card,
        },
        [ui.column({ gap: GAP.none }, rows)],
      ),
    );
  });

  return ui.box(
    { border: PRESETS.card.border, title, flex: 1, pt: PADDING.component, style: { bg: SURFACE.base } },
    [ui.column({ gap: GAP.none }, [summary, ui.divider({ char: "─" }), ...cards])],
  );
}

export function getToolsKeyHints(): string {
  return "Enter:Launch  ⇧+Enter:Embedded  d:Kill  j/k:Select  Esc:Settings";
}
