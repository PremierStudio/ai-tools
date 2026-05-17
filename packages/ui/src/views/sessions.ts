import type { UiKit } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  SEARCH_HIGHLIGHT_BG,
  getIconChar,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";
import {
  shortDate,
  computeSessionColumnWidths,
  renderSessionRow,
  renderEmptyState,
  renderColumnHeaders,
  resolveHints,
  resolveKeyHint,
} from "./utils.js";

export type SessionsViewState = {
  sessions: SessionRow[];
  selectedSessionIndex: number;
  loadingSessions: boolean;
  sessionFilter: { tool?: string; query?: string };
  sessionSort: { column: string; direction: "asc" | "desc" };
  keyOverrides: Record<string, string>;
};

export function getVisibleSessions(
  sessions: SessionRow[],
  filter: { tool?: string; query?: string },
  sort: { column: string; direction: "asc" | "desc" },
): SessionRow[] {
  return sortSessions(filterSessions(sessions, filter), sort);
}

/**
 * Render the sessions view with consistent styling.
 *
 * Header row:  Tool           Title                          Msgs   Updated
 * Selected:    bright brand-tinted row with selection bar
 */
export function renderSessionsView<T>(ui: UiKit<T>, state: SessionsViewState): T {
  const sorted = getVisibleSessions(state.sessions, state.sessionFilter, state.sessionSort);

  const searchKey = resolveKeyHint("sessions-search", state.keyOverrides, "/");
  const handoffKey = resolveKeyHint("sessions-handoff", state.keyOverrides, "H");
  const sortKey = resolveKeyHint("sessions-sort", state.keyOverrides, "s");
  const title = `  ${getIconChar("nav.sessions")} Sessions  [${searchKey}:Search  ${handoffKey}:Handoff  ${sortKey}:Sort] `;

  // ── Loading state ───────────────────────────
  if (state.loadingSessions) {
    return ui.box({ ...PRESETS.content, title, style: { bg: SURFACE.base } }, [
      ui.spinner({ variant: "dots", label: "  Loading sessions…" }),
    ]);
  }

  // ── Empty / no results states ───────────────────────────
  if (sorted.length === 0) {
    const inner: T[] = [];
    if (state.sessionFilter.query) {
      inner.push(
        ui.richText([
          {
            text: ` ${getIconChar("action.search")} `,
            style: { fg: STATUS.warning, bold: true, bg: SEARCH_HIGHLIGHT_BG },
          },
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
    inner.push(
      renderEmptyState(ui, getIconChar("nav.sessions"), "No sessions found", [
        { text: "Start a session in any supported AI tool to see it here." },
        {
          spans: [
            { text: "Press ", style: { fg: TEXT.tertiary } },
            { text: "T", style: { fg: BRAND.accent, bold: true } },
            { text: " to switch to Tools and launch a tool.", style: { fg: TEXT.tertiary } },
          ],
        },
      ]),
    );
    return ui.box({ ...PRESETS.content, title, style: { bg: SURFACE.base } }, inner);
  }

  const children: T[] = [];

  // ── Search bar ───────────────────
  if (state.sessionFilter.query) {
    children.push(
      ui.richText([
        {
          text: ` ${getIconChar("action.search")} `,
          style: { fg: STATUS.warning, bold: true, bg: SEARCH_HIGHLIGHT_BG },
        },
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
      { text: " \u2502 ", style: { fg: TEXT.tertiary } },
      { text: `${getIconChar("brand.logo")} `, style: { fg: BRAND.base, bold: true } },
      { text: `${toolCount} tools`, style: { fg: STATUS.neutral } },
      { text: " \u2502 ", style: { fg: TEXT.tertiary } },
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
    renderColumnHeaders(ui, [
      { text: "Tool" + sortArrow("tool"), width: cols.tool },
      { text: "Title" + sortArrow("title"), width: cols.title },
      { text: "Msgs" + sortArrow("messageCount"), width: cols.msgs, align: "right" },
      { text: "Updated" + sortArrow("updatedAt"), width: cols.updated, align: "right" },
    ]),
  );
  // ── Data rows ──────────
  const rows = sorted.map((s, i) => renderSessionRow(ui, s, i, state.selectedSessionIndex, cols));

  children.push(ui.column({ gap: GAP.none }, rows));

  return ui.box(
    {
      border: PRESETS.content.border,
      title,
      p: PADDING.card,
      flex: 1,
      style: { bg: SURFACE.base },
    },
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

export function getSessionsKeyHints(overrides: Record<string, string>): string {
  const hints = resolveHints(
    [
      ["sessions-detail", "Detail", "Enter"],
      ["sessions-search", "Search", "/"],
      ["sessions-handoff", "Handoff", "H"],
      ["sessions-sort", "Sort", "s"],
    ],
    overrides,
  );
  return [...hints.map(([k, l]) => `${k}:${l}`), "Esc:Clear"].join("  ");
}
