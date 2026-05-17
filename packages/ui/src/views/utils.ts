/**
 * Shared view utilities.
 *
 * Common text-formatting, layout, and data helpers used across multiple views.
 * Extracted to avoid duplication.
 */

import type { UiKit, RichSpan } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
import { getEffectiveKey } from "../preferences.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  dimColor,
  tintBg,
  chipBg,
  getIconChar,
  getToolIcon,
  getToolColor,
  PADDING,
  GAP,
  TINT,
  DIM,
} from "../theme.js";

// ── Gutter constants ─────────────────────────────────────

/** Selection gutter (2-char) for the selected row. */
export const GUTTER_SELECTED = "\u2588\u25B8";

/** Selection gutter (2-char) for unselected rows. */
export const GUTTER_UNSELECTED = "\u2590 ";

// ── Key resolution ────────────────────────────────────────

/**
 * Resolve the display key for an action ID, respecting user overrides.
 * Falls back to `fallback` if no binding is found.
 */
export function resolveKeyHint(
  actionId: string,
  overrides: Record<string, string>,
  fallback?: string,
): string {
  const effective = getEffectiveKey(actionId, overrides);
  return effective || fallback || actionId;
}

/**
 * Build an array of [key, label] hint pairs from action definitions,
 * resolving each key through user overrides.
 */
export function resolveHints(
  defs: Array<[actionId: string, label: string, fallback?: string]>,
  overrides: Record<string, string>,
): Array<[key: string, label: string]> {
  return defs.map(([actionId, label, fallback]) => [
    resolveKeyHint(actionId, overrides, fallback),
    label,
  ]);
}

// ── Text fitting ──────────────────────────────────────────

/** Truncate text with ellipsis if it exceeds `width`, pad with spaces if shorter. */
export function fitText(text: string, width: number): string {
  if (text.length <= width) return text.padEnd(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}\u2026`;
}

/** Right-align text, truncating with ellipsis if it exceeds `width`. */
export function fitTextRight(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padStart(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}\u2026`;
}

// ── Numeric helpers ───────────────────────────────────────

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Date formatting ───────────────────────────────────────

/** Format an ISO date string as a compact YYYY-MM-DD label. */
export function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

// ── Column layout ─────────────────────────────────────────

export type SessionColumnWidths = {
  tool: number;
  title: number;
  msgs: number;
  updated: number;
};

/**
 * Compute responsive column widths for a session table.
 *
 * Accounts for terminal width minus sidebar chrome, distributing
 * remaining space to the title column.
 */
export function computeSessionColumnWidths(): SessionColumnWidths {
  const terminalWidth = process.stdout.columns ?? 120;
  const estimatedContentWidth = Math.max(72, terminalWidth - 34);

  const tool = clamp(Math.floor(estimatedContentWidth * 0.2), 12, 22);
  const msgs = 8;
  const updated = 12;
  const separatorWidth = 2;
  const separators = separatorWidth * 3;
  const title = Math.max(24, estimatedContentWidth - tool - msgs - updated - separators);

  return { tool, title, msgs, updated };
}

// ── Shared rendering helpers ──────────────────────────────

/**
 * Render a single session row for session tables (used by both sessions and handoff views).
 */
export function renderSessionRow<T>(
  ui: UiKit<T>,
  session: SessionRow,
  index: number,
  selectedIndex: number,
  cols: SessionColumnWidths,
): T {
  const selected = index === selectedIndex;
  const brand = getToolColor(session.tool);
  const icon = getIconChar(getToolIcon(session.tool));
  const toolText = fitText(`${icon} ${session.tool}`, cols.tool);
  const titleText = fitText(session.title, cols.title);
  const msgsText = fitTextRight(String(session.messageCount), cols.msgs);
  const dateText = fitTextRight(shortDate(session.updatedAt), cols.updated);
  const isOdd = index % 2 === 1;

  const rowBg = selected ? tintBg(brand, TINT.emphasis) : isOdd ? SURFACE.elevated : SURFACE.base;
  const dimBrand = dimColor(brand, DIM.strong);
  const gutterColor = selected ? brand : dimColor(brand, 0.25);

  return ui.box({ style: { bg: rowBg } }, [
    ui.richText([
      {
        text: selected ? GUTTER_SELECTED : GUTTER_UNSELECTED,
        style: { fg: gutterColor, bold: selected, bg: rowBg },
      },
      { text: toolText, style: { fg: selected ? brand : dimBrand, bold: selected, bg: rowBg } },
      { text: " \u2502 ", style: { fg: TEXT.secondary, bg: rowBg } },
      {
        text: titleText,
        style: { fg: selected ? TEXT.primary : STATUS.neutral, bold: selected, bg: rowBg },
      },
      { text: " \u2502 ", style: { fg: TEXT.secondary, bg: rowBg } },
      {
        text: msgsText,
        style: { fg: selected ? BRAND.accent : TEXT.tertiary, bold: selected, bg: rowBg },
      },
      { text: " \u2502 ", style: { fg: TEXT.secondary, bg: rowBg } },
      {
        text: dateText,
        style: { fg: selected ? STATUS.neutral : TEXT.tertiary, bg: rowBg },
      },
    ]),
  ]);
}

/**
 * Render a section header with an icon and bold label.
 */
export function renderSectionHeader<T>(
  ui: Pick<UiKit<T>, "richText">,
  icon: string,
  label: string,
): T {
  return ui.richText([
    { text: `${icon} `, style: { fg: BRAND.accent, bold: true } },
    { text: label, style: { fg: BRAND.base, bold: true } },
  ]);
}

/**
 * Render an empty state block with icon, heading, and instruction bullets.
 */
export function renderEmptyState<T>(
  ui: Pick<UiKit<T>, "richText" | "box" | "column" | "text">,
  icon: string,
  heading: string,
  bullets: Array<{ text: string } | { spans: RichSpan[] }>,
): T {
  const emptyBg = tintBg(BRAND.base, TINT.subtle);
  const bulletItems: ReturnType<typeof ui.richText>[] = bullets.map((bullet) => {
    if ("spans" in bullet) {
      return ui.richText([
        { text: `  ${getIconChar("ui.bullet")} `, style: { fg: BRAND.base } },
        ...bullet.spans,
      ]);
    }
    return ui.richText([
      { text: `  ${getIconChar("ui.bullet")} `, style: { fg: BRAND.base } },
      { text: bullet.text, style: { fg: TEXT.tertiary } },
    ]);
  });

  return ui.column({ gap: GAP.standard }, [
    ui.text(""),
    ui.richText([
      { text: `  ${icon} `, style: { fg: dimColor(BRAND.base, DIM.medium), bold: true } },
      { text: heading, style: { fg: TEXT.secondary, bold: true } },
    ]),
    ui.box({ style: { bg: emptyBg }, p: PADDING.card }, [
      ui.column({ gap: GAP.tight }, bulletItems),
    ]),
  ]);
}

/**
 * Render a row of action hint chips.
 *
 * Each hint is a [key, label] pair rendered as:  ` key `:Label
 */
export function renderActionHints<T>(
  ui: Pick<UiKit<T>, "richText">,
  hints: Array<[key: string, label: string]>,
): T {
  const bg = chipBg(BRAND.base);
  const spans: RichSpan[] = [];
  hints.forEach(([key, label], i) => {
    if (i > 0) spans.push({ text: "  ", style: {} });
    spans.push({ text: ` ${key} `, style: { fg: BRAND.accent, bold: true, bg } });
    spans.push({ text: `:${label}`, style: { fg: TEXT.tertiary } });
  });
  return ui.richText(spans);
}

/**
 * Render a column header row with separators.
 */
export function renderColumnHeaders<T>(
  ui: Pick<UiKit<T>, "richText">,
  columns: Array<{ text: string; width: number; align?: "left" | "right" }>,
): T {
  const spans: RichSpan[] = [{ text: "   " }];
  columns.forEach((col, i) => {
    if (i > 0) spans.push({ text: " \u2502 ", style: { fg: TEXT.secondary } });
    const fitted =
      col.align === "right" ? fitTextRight(col.text, col.width) : fitText(col.text, col.width);
    spans.push({ text: fitted, style: { fg: BRAND.base, bold: true } });
  });
  return ui.richText(spans);
}

/**
 * Render a key hint chip (for help overlay).
 */
export function renderHintRow<T>(
  ui: Pick<UiKit<T>, "text" | "row" | "richText">,
  key: string,
  desc: string,
): T {
  const bg = chipBg(BRAND.base);
  return ui.row({ gap: GAP.standard }, [
    ui.richText([{ text: ` ${key} `, style: { fg: BRAND.accent, bold: true, bg } }]),
    ui.text(desc, { style: { fg: STATUS.neutral } }),
  ]);
}

/**
 * Compute responsive column widths for the config engine table.
 */
export function computeConfigColumnWidths(): {
  engine: number;
  status: number;
  detail: number;
} {
  const contentWidth = Math.max(70, (process.stdout.columns ?? 120) - 36);
  const engine = Math.max(14, Math.floor(contentWidth * 0.25));
  const status = Math.max(18, Math.floor(contentWidth * 0.2));
  const detail = Math.max(20, contentWidth - engine - status - 6);
  return { engine, status, detail };
}
