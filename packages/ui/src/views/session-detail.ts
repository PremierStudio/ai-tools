import type { UiKit } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
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
  PADDING,
  GAP,
  PRESETS,
  TINT,
} from "../theme.js";
import { fitText, renderEmptyState, renderActionHints, resolveHints } from "./utils.js";

export type SessionDetailState = {
  sessions: SessionRow[];
  selectedSessionId: string | null;
  keyOverrides: Record<string, string>;
};

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
    return ui.box({ ...PRESETS.content, title: "Session Detail", style: { bg: SURFACE.base } }, [
      renderEmptyState(ui, getIconChar("nav.sessions"), "Session not found", [
        { text: "The selected session may have been deleted or is no longer available." },
        {
          spans: [
            { text: "Press ", style: { fg: TEXT.tertiary } },
            { text: "Backspace", style: { fg: BRAND.accent, bold: true } },
            { text: " to return to the sessions list.", style: { fg: TEXT.tertiary } },
          ],
        },
      ]),
    ]);
  }

  const icon = getIconChar(getToolIcon(session.tool));
  const brand = getToolColor(session.tool);
  const heroBg = tintBg(brand, TINT.medium);
  const gutterBg = dimColor(brand, 0.25);
  const contentWidth = Math.max(70, (process.stdout.columns ?? 120) - 38);
  const labelWidth = Math.max(11, Math.min(14, Math.floor(contentWidth * 0.2)));
  const valueWidth = Math.max(24, contentWidth - labelWidth - 3);

  // ── Hero block — tool identity ────────────────────────
  const heroRow = ui.box({ style: { bg: heroBg }, py: PADDING.component, px: PADDING.card }, [
    ui.richText([
      {
        text: `${getIconChar("powerline.separator")} `,
        style: { fg: gutterBg, bold: true, bg: heroBg },
      },
      { text: `${icon}  `, style: { fg: brand, bold: true, bg: heroBg } },
      { text: session.toolName, style: { fg: TEXT.primary, bold: true, bg: heroBg } },
      { text: " \u2502 ", style: { fg: TEXT.secondary, bg: heroBg } },
      {
        text: `${getIconChar("nav.sessions")} ${session.messageCount} msgs`,
        style: { fg: BRAND.accent, bg: heroBg },
      },
    ]),
  ]);

  // ── Metadata rows — each richText span has label: + value in same node ────
  const metaBg = SURFACE.elevated;
  const makeMetaRow = (
    label: string,
    value: string,
    valueStyle: Record<string, unknown>,
    isAlt: boolean,
  ): T => {
    const rowBg = isAlt ? tintBg(brand, TINT.subtle) : metaBg;
    return ui.richText([
      { text: "  ", style: { bg: rowBg } },
      { text: fitText(label, labelWidth), style: { fg: STATUS.neutral, bg: rowBg } },
      { text: " \u2502 ", style: { fg: TEXT.tertiary, bg: rowBg } },
      { text: fitText(value, valueWidth), style: { ...valueStyle, bg: rowBg } },
    ]);
  };

  const metaRows: T[] = [
    makeMetaRow("Title:", session.title, { fg: TEXT.primary, bold: true }, false),
    makeMetaRow("ID:", session.id, { fg: BRAND.base }, true),
    makeMetaRow("Messages:", String(session.messageCount), { fg: BRAND.accent, bold: true }, false),
    makeMetaRow("Updated:", session.updatedAt, { fg: STATUS.info }, true),
    makeMetaRow("Tool:", `${icon}  ${session.toolName}`, { fg: brand }, false),
  ];

  // ── Action hints ─────────────────────────────────────
  const actionsLabel = ui.text("Actions:", { style: { fg: STATUS.neutral }, bold: true });
  const actionHintsRow = renderActionHints(ui, [
    ...resolveHints([["detail-handoff", "Handoff", "h"]], state.keyOverrides),
    ["Enter", "Continue"],
    ["\u232B", "Back"],
  ]);

  const titleStr = session.title.slice(0, 36);
  const actionsBg = tintBg(brand, TINT.subtle);
  return ui.box(
    {
      border: PRESETS.card.border,
      title: `Session: ${titleStr}`,
      p: PADDING.card,
      flex: 1,
      style: { bg: SURFACE.base },
    },
    [
      ui.column({ gap: GAP.tight }, [
        heroRow,
        ui.box({ style: { bg: SURFACE.elevated }, px: PADDING.card, py: PADDING.component }, [
          ui.column({ gap: GAP.tight }, metaRows),
        ]),
        ui.divider(),
        ui.box({ style: { bg: actionsBg }, px: PADDING.card, py: PADDING.component }, [
          ui.column({ gap: GAP.tight }, [actionsLabel, actionHintsRow]),
        ]),
      ]),
    ],
  );
}

export function getSessionDetailKeyHints(overrides: Record<string, string>): string {
  const hints = resolveHints([["detail-handoff", "Handoff", "h"]], overrides);
  return [...hints.map(([k, l]) => `${k}:${l}`), "Enter:Continue", "Backspace:Back"].join("  ");
}
