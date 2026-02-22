import type { UiKit } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  SEARCH_HIGHLIGHT_BG,
  dimColor,
  tintBg,
  getIconChar,
  getToolIcon,
  getToolColor,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";

export type SessionsViewState = {
  sessions: SessionRow[];
  selectedSessionIndex: number;
  loadingSessions: boolean;
  sessionFilter: { tool?: string; query?: string };
  sessionSort: { column: string; direction: "asc" | "desc" };
};

type SessionColumnWidths = {
  tool: number;
  title: number;
  msgs: number;
  updated: number;
};

/** Format ISO date as compact human label. */
function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function fitTextRight(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padStart(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function computeSessionColumnWidths(): SessionColumnWidths {
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

/**
 * Render the sessions view with consistent styling.
 *
 * Header row:  Tool           Title                          Msgs   Updated
 * Selected:    bright brand-tinted row with selection bar
 */
export function renderSessionsView<T>(ui: UiKit<T>, state: SessionsViewState): T {
  const filtered = filterSessions(state.sessions, state.sessionFilter);
  const sorted = sortSessions(filtered, state.sessionSort);

  const title = `  ${getIconChar("nav.sessions")} Sessions  [/:Search  H:Handoff  s:Sort]  `;

  // ── Loading state ───────────────────────────
  if (state.loadingSessions) {
    return ui.box(
      { ...PRESETS.content, title, style: { bg: SURFACE.base } },
      [ui.spinner({ variant: "dots", label: "  Loading sessions…" })],
    );
  }

  // ── Empty / no results states ───────────────────────────
  if (sorted.length === 0) {
    const inner: T[] = [];
    if (state.sessionFilter.query) {
      inner.push(
        ui.richText([
          { text: ` ${getIconChar("action.search")} `, style: { fg: STATUS.warning, bold: true, bg: SEARCH_HIGHLIGHT_BG } },
          {
            text: ` ${state.sessionFilter.query} `,
            style: { fg: STATUS.warning, bg: SEARCH_HIGHLIGHT_BG },
          },
          { text: "  — no matches  ", style: { fg: STATUS.neutral } },
          { text: "Esc", style: { fg: BRAND.base, bold: true } },
          { text: " to clear", style: { fg: TEXT.tertiary } },
        ]),
      );
      inner.push(ui.divider());
    }
    inner.push(ui.text("No sessions found.", { style: { fg: TEXT.tertiary }, dim: true }));
    return ui.box({ ...PRESETS.content, title, style: { bg: SURFACE.base } }, inner);
  }

  const children: T[] = [];

  // ── Search bar ───────────────────
  if (state.sessionFilter.query) {
    children.push(
      ui.richText([
        { text: ` ${getIconChar("action.search")} `, style: { fg: STATUS.warning, bold: true, bg: SEARCH_HIGHLIGHT_BG } },
        {
          text: ` ${state.sessionFilter.query} `,
          style: { fg: STATUS.warning, bg: SEARCH_HIGHLIGHT_BG },
        },
        {
          text: `  ${sorted.length} result${sorted.length !== 1 ? "s" : ""}  `,
          style: { fg: STATUS.neutral },
        },
        { text: "Esc", style: { fg: BRAND.base, bold: true } },
        { text: ":clear", style: { fg: TEXT.tertiary } },
      ]),
    );
    children.push(ui.divider());
  }

  const toolCount = new Set(sorted.map((s) => s.tool)).size;
  const newestDate = shortDate(sorted[0]?.updatedAt ?? "");
  children.push(
    ui.richText([
      { text: `${getIconChar("status.active")} `, style: { fg: BRAND.accent, bold: true } },
      { text: `${sorted.length} sessions`, style: { fg: STATUS.neutral } },
      { text: "  │  ", style: { fg: TEXT.tertiary } },
      { text: `${getIconChar("brand.logo")} `, style: { fg: BRAND.base, bold: true } },
      { text: `${toolCount} tools`, style: { fg: STATUS.neutral } },
      { text: "  │  ", style: { fg: TEXT.tertiary } },
      { text: `${getIconChar("action.refresh")} `, style: { fg: BRAND.base, bold: true } },
      { text: newestDate || "n/a", style: { fg: STATUS.neutral } },
    ]),
  );
  children.push(ui.divider({ char: "─" }));

  // ── Column header ────────────────
  const sortArrow = (col: string) =>
    state.sessionSort.column === col ? (state.sessionSort.direction === "asc" ? " ▲" : " ▼") : "";

  const cols = computeSessionColumnWidths();

  children.push(
    ui.richText([
      { text: "   " },
      {
        text: fitText("Tool" + sortArrow("tool"), cols.tool),
        style: { fg: BRAND.base, bold: true },
      },
      { text: " │ ", style: { fg: TEXT.secondary } },
      {
        text: fitText("Title" + sortArrow("title"), cols.title),
        style: { fg: BRAND.base, bold: true },
      },
      { text: " │ ", style: { fg: TEXT.secondary } },
      {
        text: fitTextRight("Msgs" + sortArrow("messageCount"), cols.msgs),
        style: { fg: BRAND.base, bold: true },
      },
      { text: " │ ", style: { fg: TEXT.secondary } },
      {
        text: fitTextRight("Updated" + sortArrow("updatedAt"), cols.updated),
        style: { fg: BRAND.base, bold: true },
      },
    ]),
  );
  children.push(ui.divider({ char: "─" }));

  // ── Data rows ──────────
  const rows = sorted.map((s, i) => {
    const selected = i === state.selectedSessionIndex;
    const brand = getToolColor(s.tool);
    const icon = getIconChar(getToolIcon(s.tool));
    const toolText = fitText(`${icon} ${s.tool}`, cols.tool);
    const titleText = fitText(s.title, cols.title);
    const msgsText = fitTextRight(String(s.messageCount), cols.msgs);
    const dateText = fitTextRight(shortDate(s.updatedAt), cols.updated);
    const isOdd = i % 2 === 1;

    if (selected) {
      const selBg = tintBg(brand, 0.15);
      return ui.box({ style: { bg: selBg }, pl: 0 }, [
        ui.richText([
          { text: `${getIconChar("select.selected")} `, style: { fg: brand, bold: true, bg: selBg } },
          { text: toolText, style: { fg: brand, bold: true, bg: selBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selBg } },
          { text: titleText, style: { fg: TEXT.primary, bold: true, bg: selBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selBg } },
          { text: msgsText, style: { fg: BRAND.accent, bold: true, bg: selBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selBg } },
          { text: dateText, style: { fg: STATUS.neutral, bg: selBg } },
        ]),
      ]);
    }

    const rowBg = isOdd ? SURFACE.elevated : undefined;
    const dimBrand = dimColor(brand, 0.6);

    if (rowBg) {
      return ui.box({ style: { bg: rowBg } }, [
        ui.richText([
          { text: "  " },
          { text: toolText, style: { fg: dimBrand, bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: titleText, style: { fg: STATUS.neutral, bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: msgsText, style: { fg: TEXT.tertiary, bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: dateText, style: { fg: TEXT.tertiary, bg: rowBg } },
        ]),
      ]);
    }

    return ui.richText([
      { text: "  " },
      { text: toolText, style: { fg: dimBrand } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: titleText, style: { fg: STATUS.neutral } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: msgsText, style: { fg: TEXT.tertiary } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: dateText, style: { fg: TEXT.tertiary } },
    ]);
  });

  children.push(ui.column({ gap: GAP.none }, rows));

  return ui.box(
    { border: PRESETS.card.border, title, p: PADDING.card, flex: 1, style: { bg: SURFACE.base } },
    children,
  );
}

// ── filter / sort helpers ──────────────────────────────

export function filterSessions(
  sessions: SessionRow[],
  filter: { tool?: string; query?: string },
): SessionRow[] {
  let result = sessions;
  if (filter.tool) result = result.filter((s) => s.tool === filter.tool);
  if (filter.query) {
    const q = filter.query.toLowerCase();
    result = result.filter((s) => s.title.toLowerCase().includes(q));
  }
  return result;
}

export function sortSessions(
  sessions: SessionRow[],
  sort: { column: string; direction: "asc" | "desc" },
): SessionRow[] {
  const sorted = [...sessions];
  const dir = sort.direction === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    switch (sort.column) {
      case "tool":
        return a.tool.localeCompare(b.tool) * dir;
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "messageCount":
        return (a.messageCount - b.messageCount) * dir;
      case "updatedAt":
        return a.updatedAt.localeCompare(b.updatedAt) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}

export function cycleSortColumn(current: { column: string; direction: "asc" | "desc" }): {
  column: string;
  direction: "asc" | "desc";
} {
  const columns = ["updatedAt", "tool", "title", "messageCount"];
  const idx = columns.indexOf(current.column);
  if (current.direction === "asc") {
    return { column: current.column, direction: "desc" };
  }
  const nextIdx = (idx + 1) % columns.length;
  return { column: columns[nextIdx] ?? "updatedAt", direction: "asc" };
}

export function getSessionsKeyHints(): string {
  return "Enter:Detail  /:Search  H:Handoff  s:Sort  Esc:Clear";
}
