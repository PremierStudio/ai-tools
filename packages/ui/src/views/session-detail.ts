import type { UiKit } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  ACTION_PRIMARY_BG,
  dimColor,
  tintBg,
  getIconChar,
  getToolIcon,
  getToolColor,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";

export type SessionDetailState = {
  sessions: SessionRow[];
  selectedSessionId: string | null;
};

function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

/**
 * Render a rich single-session detail panel.
 *
 *  ╭── Session: Build the authentication system ────────────╮
 *  │ ▌                                                       │
 *  │ ▌  ◉ Claude Code                     ▶ running         │  ← brand hero row
 *  │ ▌                                                       │
 *  │  ─────────────────────────────────────────────────────  │
 *  │  Title:     Build the authentication system             │
 *  │  ID:        a1b2c3d4e5f6…                               │
 *  │  Messages:  42                                          │
 *  │  Updated:   2026-02-19                                  │
 *  │  Tool:      ◉ Claude Code                               │
 *  │  ─────────────────────────────────────────────────────  │
 *  │  Actions:                                               │
 *  │  h:Handoff   Enter:Continue   ⌫:Back                   │
 *  ╰────────────────────────────────────────────────────────╯
 */
export function renderSessionDetailView<T>(ui: UiKit<T>, state: SessionDetailState): T {
  const session = state.sessions.find((s) => s.id === state.selectedSessionId);

  if (!session) {
    return ui.box(
      { ...PRESETS.content, title: "Session Detail", style: { bg: SURFACE.base } },
      [ui.text("Session not found.", { style: { fg: TEXT.tertiary }, dim: true })],
    );
  }

  const icon = getIconChar(getToolIcon(session.tool));
  const brand = getToolColor(session.tool);
  const dimBrand = dimColor(brand, 0.4);
  const heroBg = tintBg(brand, 0.14);
  const gutterBg = dimColor(brand, 0.25);
  const contentWidth = Math.max(70, (process.stdout.columns ?? 120) - 38);
  const labelWidth = Math.max(11, Math.min(14, Math.floor(contentWidth * 0.2)));
  const valueWidth = Math.max(24, contentWidth - labelWidth - 3);

  // ── Hero block — tool identity ────────────────────────
  const heroRow = ui.box({ style: { bg: heroBg }, py: 1, px: 2 }, [
    ui.richText([
      { text: `${getIconChar("powerline.separator")} `, style: { fg: gutterBg, bold: true, bg: heroBg } },
      { text: `${icon}  `, style: { fg: brand, bold: true, bg: heroBg } },
      { text: session.toolName, style: { fg: TEXT.primary, bold: true, bg: heroBg } },
      { text: "  │  ", style: { fg: TEXT.secondary, bg: heroBg } },
      { text: `${getIconChar("nav.sessions")} ${session.messageCount} msgs`, style: { fg: BRAND.accent, bg: heroBg } },
    ]),
  ]);

  // ── Metadata rows — each richText span has label: + value in same node ────
  const makeMetaRow = (
    label: string,
    value: string,
    valueStyle: Record<string, unknown>,
    rowBg?: { r: number; g: number; b: number },
  ): T =>
    ui.richText([
      { text: "  ", style: rowBg ? { bg: rowBg } : undefined },
      { text: fitText(label, labelWidth), style: { fg: STATUS.neutral, bg: rowBg } },
      { text: " │ ", style: { fg: TEXT.tertiary, bg: rowBg } },
      { text: fitText(value, valueWidth), style: { ...valueStyle, bg: rowBg } },
    ]);

  const metaRows: T[] = [
    makeMetaRow("Title:", session.title, { fg: TEXT.primary, bold: true }),
    makeMetaRow("ID:", session.id, { fg: BRAND.base }, tintBg(brand, 0.06)),
    makeMetaRow("Messages:", String(session.messageCount), { fg: BRAND.accent, bold: true }),
    makeMetaRow("Updated:", session.updatedAt, { fg: STATUS.info }, tintBg(brand, 0.06)),
    makeMetaRow("Tool:", `${icon}  ${session.toolName}`, { fg: brand }),
  ];

  // ── Action hints ─────────────────────────────────────
  const actionsLabel = ui.text("Actions:", { style: { fg: STATUS.neutral }, bold: true });
  const actionHintsRow = ui.richText([
    { text: " h ", style: { fg: brand, bold: true, bg: dimBrand } },
    { text: " Handoff   ", style: { fg: TEXT.tertiary } },
    { text: " Enter ", style: { fg: STATUS.success, bold: true, bg: ACTION_PRIMARY_BG } },
    { text: " Continue   ", style: { fg: TEXT.tertiary } },
    { text: " ⌫ ", style: { fg: TEXT.secondary, bold: true } },
    { text: " Back", style: { fg: TEXT.tertiary } },
  ]);

  const titleStr = session.title.slice(0, 36);
  return ui.box(
    { border: PRESETS.card.border, title: `Session: ${titleStr}`, p: "none", flex: 1, style: { bg: SURFACE.base } },
    [
      ui.column({ gap: GAP.none }, [
        heroRow,
        ui.column({ gap: GAP.none, px: PADDING.card, py: PADDING.component }, metaRows),
        ui.divider(),
        ui.box({ px: PADDING.card, pb: PADDING.component }, [
          ui.column({ gap: GAP.none }, [actionsLabel, actionHintsRow]),
        ]),
      ]),
    ],
  );
}

export function getSessionDetailKeyHints(): string {
  return "h:Handoff  Enter:Continue  Backspace:Back";
}
