/**
 * Settings menu — Bashtop-style overlay.
 *
 * Three tabs:
 *   "theme"     — visual theme picker with preview swatches
 *   "keys"      — searchable keybinding viewer/customizer
 *   "general"   — misc preferences
 *
 * Opened with Escape from dashboard mode.
 * Navigate tabs with Left/Right arrows or 1-3 number keys.
 * Close with Escape or q.
 */

import type { UiKit } from "../types.js";
import {
  AVAILABLE_THEMES,
  searchKeybindings,
  SESSION_REFRESH_ACTIVE_OPTIONS_MS,
  SESSION_REFRESH_IDLE_OPTIONS_MS,
  type ThemeName,
} from "../preferences.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  OVERLAY_WIDTH,
  COLOR_SEPARATOR_DIM,
  dimColor,
  getIconChar,
  PADDING,
  GAP,
} from "../theme.js";

// ── State ──────────────────────────────────────────────

export type SettingsTab = "theme" | "keys" | "general";

export type SettingsMenuState = {
  activeTab: SettingsTab;
  /** Keybinding search query */
  keySearch: string;
  /** Index of focused keybinding row */
  keySelectedIndex: number;
  /** True when user is editing a keybinding (waiting for new key press) */
  editingKey: boolean;
  /** Current theme selection (mirror of TuiState.theme) */
  selectedTheme: ThemeName;
  /** General: whether to show running pane count in sidebar badge */
  showPaneBadge: boolean;
  /** General: fps cap selection index into FPS_OPTIONS */
  fpsCap: number;
  /** General: session refresh interval when sessions view is active */
  sessionRefreshActiveMs: number;
  /** General: session refresh interval when sessions view is not active */
  sessionRefreshIdleMs: number;
};

export const FPS_OPTIONS = [15, 30, 60] as const;
export type FpsCap = (typeof FPS_OPTIONS)[number];

export const SETTINGS_TABS: SettingsTab[] = ["theme", "keys", "general"];
const TAB_LABELS: Record<SettingsTab, string> = {
  theme: "1: Theme",
  keys: "2: Keybindings",
  general: "3: General",
};

export function createSettingsMenuState(
  currentTheme: ThemeName,
  general?: {
    showPaneBadge?: boolean;
    fpsCap?: number;
    sessionRefreshActiveMs?: number;
    sessionRefreshIdleMs?: number;
  },
): SettingsMenuState {
  return {
    activeTab: "theme",
    keySearch: "",
    keySelectedIndex: 0,
    editingKey: false,
    selectedTheme: currentTheme,
    showPaneBadge: general?.showPaneBadge ?? true,
    fpsCap: general?.fpsCap ?? 30,
    sessionRefreshActiveMs: general?.sessionRefreshActiveMs ?? 15_000,
    sessionRefreshIdleMs: general?.sessionRefreshIdleMs ?? 60_000,
  };
}

// ── Key handling ───────────────────────────────────────

export type SettingsAction =
  | { type: "apply-theme"; theme: ThemeName; closeAfter?: boolean }
  | { type: "set-key-override"; actionId: string; key: string }
  | {
      type: "update-general";
      showPaneBadge: boolean;
      fpsCap: number;
      sessionRefreshActiveMs: number;
      sessionRefreshIdleMs: number;
    }
  | { type: "close" };

export type SettingsKeyResult = {
  state: SettingsMenuState;
  action: SettingsAction | null;
};

export function handleSettingsKey(
  state: SettingsMenuState,
  key: string,
  ctrl?: boolean,
): SettingsKeyResult {
  // ── Tab switching (always available, even on keys tab) ──
  // But only when not editing a key binding
  if (!state.editingKey) {
    if (key === "1") {
      return { state: { ...state, activeTab: "theme" }, action: null };
    }
    if (key === "2") {
      return { state: { ...state, activeTab: "keys" }, action: null };
    }
    if (key === "3") {
      return { state: { ...state, activeTab: "general" }, action: null };
    }
    if (key === "Left") {
      const idx = Math.max(0, SETTINGS_TABS.indexOf(state.activeTab) - 1);
      return { state: { ...state, activeTab: SETTINGS_TABS[idx] ?? "theme" }, action: null };
    }
    if (key === "Right") {
      const idx = Math.min(SETTINGS_TABS.length - 1, SETTINGS_TABS.indexOf(state.activeTab) + 1);
      return { state: { ...state, activeTab: SETTINGS_TABS[idx] ?? "general" }, action: null };
    }
  }

  // ── Keys tab handles its own navigation, search, edit mode ──
  // q and Escape have context-sensitive meaning on this tab.
  if (state.activeTab === "keys") {
    return handleKeysKey(state, key);
  }

  // ── Close (theme / general tabs) ──
  if (key === "Escape" || (ctrl && key === "c") || key === "q") {
    return { state, action: { type: "close" } };
  }

  // ── Tab-specific ──
  switch (state.activeTab) {
    case "theme":
      return handleThemeKey(state, key);
    case "general":
      return handleGeneralKey(state, key);
  }

  // ── Close (theme / general tabs only) ──
  if (key === "Escape" || (ctrl && key === "c") || key === "q") {
    return { state, action: { type: "close" } };
  }

  // ── Tab switching ──
  if (key === "1") {
    return { state: { ...state, activeTab: "theme" }, action: null };
  }
  if (key === "2") {
    return { state: { ...state, activeTab: "keys" }, action: null };
  }
  if (key === "3") {
    return { state: { ...state, activeTab: "general" }, action: null };
  }
  if (key === "Left") {
    const idx = Math.max(0, SETTINGS_TABS.indexOf(state.activeTab) - 1);
    return { state: { ...state, activeTab: SETTINGS_TABS[idx] ?? "theme" }, action: null };
  }
  if (key === "Right") {
    const idx = Math.min(SETTINGS_TABS.length - 1, SETTINGS_TABS.indexOf(state.activeTab) + 1);
    return { state: { ...state, activeTab: SETTINGS_TABS[idx] ?? "general" }, action: null };
  }

  // ── Tab-specific (keys tab already handled above) ──
  switch (state.activeTab) {
    case "theme":
      return handleThemeKey(state, key);
    case "general":
      return handleGeneralKey(state, key);
  }
}

function handleThemeKey(state: SettingsMenuState, key: string): SettingsKeyResult {
  const themeIdx = AVAILABLE_THEMES.indexOf(state.selectedTheme);

  if (key === "j" || key === "Down") {
    const next = Math.min(AVAILABLE_THEMES.length - 1, themeIdx + 1);
    const theme = AVAILABLE_THEMES[next] ?? state.selectedTheme;
    return {
      state: { ...state, selectedTheme: theme },
      action: { type: "apply-theme", theme },
    };
  }
  if (key === "k" || key === "Up") {
    const prev = Math.max(0, themeIdx - 1);
    const theme = AVAILABLE_THEMES[prev] ?? state.selectedTheme;
    return {
      state: { ...state, selectedTheme: theme },
      action: { type: "apply-theme", theme },
    };
  }
  if (key === "Enter") {
    // Confirm current theme and close the settings menu
    return { state, action: { type: "apply-theme", theme: state.selectedTheme, closeAfter: true } };
  }

  return { state, action: null };
}

function handleKeysKey(state: SettingsMenuState, key: string): SettingsKeyResult {
  const filtered = searchKeybindings(state.keySearch);

  if (state.editingKey) {
    // Any key while editing captures the new binding
    if (key === "Escape") {
      return { state: { ...state, editingKey: false }, action: null };
    }
    const binding = filtered[state.keySelectedIndex];
    if (binding) {
      return {
        state: { ...state, editingKey: false },
        action: { type: "set-key-override", actionId: binding.id, key },
      };
    }
    return { state: { ...state, editingKey: false }, action: null };
  }

  // Escape: clear search if active, otherwise close the menu
  if (key === "Escape") {
    if (state.keySearch.length > 0) {
      return { state: { ...state, keySearch: "", keySelectedIndex: 0 }, action: null };
    }
    return { state, action: { type: "close" } };
  }

  // q while no search → close menu (matches theme/general close behaviour)
  if (key === "q" && state.keySearch.length === 0) {
    return { state, action: { type: "close" } };
  }

  if (key === "j" || key === "Down") {
    return {
      state: {
        ...state,
        keySelectedIndex: Math.min(filtered.length - 1, state.keySelectedIndex + 1),
      },
      action: null,
    };
  }
  if (key === "k" || key === "Up") {
    return {
      state: { ...state, keySelectedIndex: Math.max(0, state.keySelectedIndex - 1) },
      action: null,
    };
  }
  if (key === "Enter" || key === "e") {
    // Start editing the selected binding
    return { state: { ...state, editingKey: true }, action: null };
  }
  // Text input → filter search (single printable chars)
  if (key.length === 1 && key >= " " && key !== "q") {
    return {
      state: { ...state, keySearch: state.keySearch + key, keySelectedIndex: 0 },
      action: null,
    };
  }
  // q appends to search when search is already active
  if (key === "q" && state.keySearch.length > 0) {
    return {
      state: { ...state, keySearch: state.keySearch + key, keySelectedIndex: 0 },
      action: null,
    };
  }
  if (key === "Backspace") {
    return {
      state: {
        ...state,
        keySearch: state.keySearch.slice(0, -1),
        keySelectedIndex: 0,
      },
      action: null,
    };
  }

  return { state, action: null };
}

function handleGeneralKey(state: SettingsMenuState, key: string): SettingsKeyResult {
  if (key === "b") {
    const next = { ...state, showPaneBadge: !state.showPaneBadge };
    return {
      state: next,
      action: {
        type: "update-general",
        showPaneBadge: next.showPaneBadge,
        fpsCap: next.fpsCap,
        sessionRefreshActiveMs: next.sessionRefreshActiveMs,
        sessionRefreshIdleMs: next.sessionRefreshIdleMs,
      },
    };
  }
  if (key === "f") {
    const idx = FPS_OPTIONS.indexOf(state.fpsCap as FpsCap);
    const next = FPS_OPTIONS[(idx + 1) % FPS_OPTIONS.length] ?? 30;
    const updated = { ...state, fpsCap: next };
    return {
      state: updated,
      action: {
        type: "update-general",
        showPaneBadge: updated.showPaneBadge,
        fpsCap: updated.fpsCap,
        sessionRefreshActiveMs: updated.sessionRefreshActiveMs,
        sessionRefreshIdleMs: updated.sessionRefreshIdleMs,
      },
    };
  }
  if (key === "a") {
    const idx = SESSION_REFRESH_ACTIVE_OPTIONS_MS.indexOf(
      state.sessionRefreshActiveMs as (typeof SESSION_REFRESH_ACTIVE_OPTIONS_MS)[number],
    );
    const next =
      SESSION_REFRESH_ACTIVE_OPTIONS_MS[(idx + 1) % SESSION_REFRESH_ACTIVE_OPTIONS_MS.length] ??
      15_000;
    const updated = { ...state, sessionRefreshActiveMs: next };
    return {
      state: updated,
      action: {
        type: "update-general",
        showPaneBadge: updated.showPaneBadge,
        fpsCap: updated.fpsCap,
        sessionRefreshActiveMs: updated.sessionRefreshActiveMs,
        sessionRefreshIdleMs: updated.sessionRefreshIdleMs,
      },
    };
  }
  if (key === "i") {
    const idx = SESSION_REFRESH_IDLE_OPTIONS_MS.indexOf(
      state.sessionRefreshIdleMs as (typeof SESSION_REFRESH_IDLE_OPTIONS_MS)[number],
    );
    const next =
      SESSION_REFRESH_IDLE_OPTIONS_MS[(idx + 1) % SESSION_REFRESH_IDLE_OPTIONS_MS.length] ?? 60_000;
    const updated = { ...state, sessionRefreshIdleMs: next };
    return {
      state: updated,
      action: {
        type: "update-general",
        showPaneBadge: updated.showPaneBadge,
        fpsCap: updated.fpsCap,
        sessionRefreshActiveMs: updated.sessionRefreshActiveMs,
        sessionRefreshIdleMs: updated.sessionRefreshIdleMs,
      },
    };
  }
  return { state, action: null };
}

// ── Render ─────────────────────────────────────────────

const THEME_SWATCHES: Record<ThemeName, string> = {
  dark: "  #1e1e2e  ",
  light: "  #ffffff  ",
  dim: "  #2e3440  ",
  highContrast: "  #000000  ",
  nord: "  #2e3440  ",
  dracula: "  #282a36  ",
};

const THEME_DESCRIPTIONS: Record<ThemeName, string> = {
  dark: "Default dark theme",
  light: "Light background",
  dim: "Dimmed low-contrast dark",
  highContrast: "High contrast for accessibility",
  nord: "Nordic blue-grey palette",
  dracula: "Purple/magenta dark theme",
};

export function renderSettingsMenu<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "divider" | "richText" | "modal">,
  state: SettingsMenuState,
  keyOverrides: Record<string, string>,
): T {
  const tabBar = renderTabBar(ui, state.activeTab);
  const tabContent = renderTabContent(ui, state, keyOverrides);

  // Use ui.modal() for proper overlay behavior - appears centered on top of content
  return ui.modal({
    id: "settings",
    backdrop: "dim",
    width: OVERLAY_WIDTH,
    title: `  ${getIconChar("nav.settings")} Settings  `,
    closeOnEscape: false,
    closeOnBackdrop: false,
    style: { bg: SURFACE.base },
    content: ui.column({ gap: GAP.none, p: PADDING.component }, [
      tabBar,
      ui.divider({ char: "─" }),
      tabContent,
      ui.divider({ char: "─" }),
      ui.richText([
        {
          text: " 1-3 ",
          style: { fg: BRAND.accent, bold: true, bg: dimColor(BRAND.base, 0.25) },
        },
        { text: ":Tab  ", style: { fg: TEXT.tertiary } },
        {
          text: " j/k ",
          style: { fg: BRAND.accent, bold: true, bg: dimColor(BRAND.base, 0.25) },
        },
        { text: ":Navigate  ", style: { fg: TEXT.tertiary } },
        {
          text: " Enter ",
          style: { fg: BRAND.accent, bold: true, bg: dimColor(BRAND.base, 0.25) },
        },
        { text: ":Select  ", style: { fg: TEXT.tertiary } },
        { text: " Esc ", style: { fg: TEXT.tertiary, bold: true } },
        { text: "/", style: { fg: COLOR_SEPARATOR_DIM } },
        { text: " q ", style: { fg: TEXT.tertiary, bold: true } },
        { text: ":Close", style: { fg: TEXT.tertiary } },
      ]),
    ]),
  });
}

function renderTabBar<T>(ui: Pick<UiKit<T>, "text" | "row" | "richText">, active: SettingsTab): T {
  const tabs = SETTINGS_TABS.map((tab) => {
    const isActive = tab === active;
    const label = TAB_LABELS[tab];
    if (isActive) {
      return ui.richText([
        {
          text: ` ${label} `,
          style: { fg: TEXT.primary, bold: true, bg: dimColor(BRAND.base, 0.3) },
        },
      ]);
    }
    return ui.text(label, { style: { fg: STATUS.neutral } });
  });
  return ui.row({ gap: GAP.standard }, tabs);
}

function renderTabContent<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "divider" | "richText">,
  state: SettingsMenuState,
  keyOverrides: Record<string, string>,
): T {
  switch (state.activeTab) {
    case "theme":
      return renderThemeTab(ui, state);
    case "keys":
      return renderKeysTab(ui, state, keyOverrides);
    case "general":
      return renderGeneralTab(ui, state);
  }
}

/** Hex background colors shown as visual swatches per theme. */
const THEME_BG_COLORS: Record<ThemeName, { r: number; g: number; b: number }> = {
  dark: { r: 30, g: 30, b: 46 },
  light: { r: 240, g: 240, b: 248 },
  dim: { r: 46, g: 52, b: 64 },
  highContrast: { r: 0, g: 0, b: 0 },
  nord: { r: 46, g: 52, b: 64 },
  dracula: { r: 40, g: 42, b: 54 },
};

function renderThemeTab<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "richText">,
  state: SettingsMenuState,
): T {
  const rows = AVAILABLE_THEMES.map((theme) => {
    const isSelected = theme === state.selectedTheme;
    const indicator = isSelected ? getIconChar("select.selected") : " ";
    const desc = THEME_DESCRIPTIONS[theme] ?? "";
    const swatchBg = THEME_BG_COLORS[theme] ?? { r: 40, g: 40, b: 50 };
    const selBg = dimColor(BRAND.base, 0.18);
    const rowBg = isSelected ? selBg : undefined;
    return ui.richText([
      {
        text: ` ${indicator} `,
        style: {
          fg: isSelected ? BRAND.accent : TEXT.tertiary,
          bold: isSelected,
          ...(rowBg ? { bg: rowBg } : {}),
        },
      },
      {
        text: theme.padEnd(14),
        style: {
          fg: isSelected ? TEXT.primary : STATUS.neutral,
          bold: isSelected,
          ...(rowBg ? { bg: rowBg } : {}),
        },
      },
      { text: "  ", style: { bg: swatchBg } },
      { text: THEME_SWATCHES[theme] ?? "         ", style: { bg: swatchBg } },
      { text: "  ", style: { bg: swatchBg } },
      { text: "  " + desc, style: { fg: isSelected ? STATUS.warning : TEXT.tertiary } },
    ]);
  });

  return ui.column({ gap: GAP.none }, [
    ui.richText([
      {
        text: " Theme ",
        style: { fg: TEXT.primary, bold: true, bg: dimColor(BRAND.base, 0.25) },
      },
      { text: "  j/k: move  Enter: apply", style: { fg: TEXT.tertiary } },
    ]),
    ui.text(""),
    ...rows,
  ]);
}

function renderKeysTab<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "divider">,
  state: SettingsMenuState,
  keyOverrides: Record<string, string>,
): T {
  const filtered = searchKeybindings(state.keySearch);

  const rows: T[] = [];

  if (state.editingKey) {
    const binding = filtered[state.keySelectedIndex];
    rows.push(
      ui.text(`Press new key for \u201c${binding?.label ?? "?"}\u201d: `, {
        bold: true,
        style: { fg: STATUS.warning },
      }),
      ui.text("(Esc to cancel)", { dim: true, style: { fg: STATUS.neutral } }),
    );
    return ui.column({ gap: GAP.none }, rows);
  }

  // Search bar
  rows.push(
    ui.row({ gap: GAP.tight }, [
      ui.text(`${getIconChar("action.search")} Search:`, { style: { fg: STATUS.info } }),
      ui.text(state.keySearch || "(type to filter)", {
        dim: !state.keySearch,
        style: { fg: state.keySearch ? STATUS.warning : STATUS.neutral },
      }),
    ]),
  );

  if (filtered.length === 0) {
    rows.push(ui.text("  No keybindings match.", { dim: true, style: { fg: STATUS.neutral } }));
    return ui.column({ gap: GAP.none }, rows);
  }

  let prevContext = "";
  for (let i = 0; i < Math.min(filtered.length, 20); i++) {
    const b = filtered[i];
    if (!b) continue;

    if (b.context !== prevContext) {
      if (prevContext) rows.push(ui.text(""));
      const ctx = b.context.charAt(0).toUpperCase() + b.context.slice(1);
      rows.push(ui.text(ctx, { bold: true, style: { fg: STATUS.info } }));
      prevContext = b.context;
    }

    const isSelected = i === state.keySelectedIndex;
    const prefix = isSelected ? getIconChar("select.selected") : " ";
    const override = keyOverrides[b.id];
    const keyDisplay = override ? `${b.defaultKey} \u2192 ${override}` : b.defaultKey;
    const label = b.label.padEnd(22);
    const key = keyDisplay.padEnd(18);
    const desc = b.description ?? "";

    rows.push(
      ui.text(`${prefix} ${label} ${key} ${desc}`, {
        bold: isSelected,
        dim: !isSelected,
        style: { fg: isSelected ? STATUS.success : STATUS.neutral },
      }),
    );
  }

  if (filtered.length > 20) {
    rows.push(
      ui.text(`  \u2026 ${filtered.length - 20} more (refine search)`, {
        dim: true,
        style: { fg: STATUS.neutral },
      }),
    );
  }

  rows.push(ui.text(""));
  rows.push(
    ui.text("j/k: move  Enter/e: rebind  Backspace: clear  (type to search)", {
      dim: true,
      style: { fg: STATUS.neutral },
    }),
  );

  return ui.column({ gap: GAP.none }, rows);
}

function renderGeneralTab<T>(
  ui: Pick<UiKit<T>, "text" | "column" | "row">,
  state: SettingsMenuState,
): T {
  const badgeOn = state.showPaneBadge;
  const fpsLabel = `${state.fpsCap} fps`;
  const activeLabel = `${Math.floor(state.sessionRefreshActiveMs / 1000)}s`;
  const idleLabel = `${Math.floor(state.sessionRefreshIdleMs / 1000)}s`;

  return ui.column({ gap: GAP.tight }, [
    ui.text("General Settings", { bold: true, style: { fg: STATUS.info } }),
    ui.text(""),
    ui.row({ gap: GAP.standard }, [
      ui.text("b", { bold: true, style: { fg: STATUS.success } }),
      ui.text("Sidebar pane count badge:"),
      ui.text(badgeOn ? "[on]" : "[off]", {
        bold: true,
        style: { fg: badgeOn ? STATUS.success : STATUS.neutral },
      }),
    ]),
    ui.row({ gap: GAP.standard }, [
      ui.text("f", { bold: true, style: { fg: STATUS.success } }),
      ui.text("Render FPS cap:"),
      ui.text(`[${fpsLabel}]`, { bold: true, style: { fg: STATUS.warning } }),
      ui.text("(cycles 15 \u2192 30 \u2192 60)", { dim: true, style: { fg: STATUS.neutral } }),
    ]),
    ui.row({ gap: GAP.standard }, [
      ui.text("a", { bold: true, style: { fg: STATUS.success } }),
      ui.text("Sessions refresh (active view):"),
      ui.text(`[${activeLabel}]`, { bold: true, style: { fg: STATUS.warning } }),
      ui.text("(cycles 10s \u2192 15s \u2192 30s)", { dim: true, style: { fg: STATUS.neutral } }),
    ]),
    ui.row({ gap: GAP.standard }, [
      ui.text("i", { bold: true, style: { fg: STATUS.success } }),
      ui.text("Sessions refresh (idle):"),
      ui.text(`[${idleLabel}]`, { bold: true, style: { fg: STATUS.warning } }),
      ui.text("(cycles 30s \u2192 60s \u2192 120s)", { dim: true, style: { fg: STATUS.neutral } }),
    ]),
    ui.text(""),
    ui.text("Changes take effect immediately.", { dim: true, style: { fg: STATUS.neutral } }),
  ]);
}
