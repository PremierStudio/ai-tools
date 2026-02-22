import { describe, it, expect } from "vitest";
import { mockUi } from "../test-helpers.js";
import {
  createSettingsMenuState,
  handleSettingsKey,
  renderSettingsMenu,
  SETTINGS_TABS,
  FPS_OPTIONS,
  type SettingsMenuState,
} from "./settings.js";

function makeState(overrides: Partial<SettingsMenuState> = {}): SettingsMenuState {
  return { ...createSettingsMenuState("dark"), ...overrides };
}

// ── createSettingsMenuState ───────────────────────────

describe("createSettingsMenuState", () => {
  it("defaults to theme tab", () => {
    const s = createSettingsMenuState("dark");
    expect(s.activeTab).toBe("theme");
  });

  it("reflects the current theme", () => {
    const s = createSettingsMenuState("nord");
    expect(s.selectedTheme).toBe("nord");
  });

  it("starts with empty key search", () => {
    const s = createSettingsMenuState("dark");
    expect(s.keySearch).toBe("");
  });

  it("starts with key selection at 0", () => {
    const s = createSettingsMenuState("dark");
    expect(s.keySelectedIndex).toBe(0);
  });

  it("starts not editing a key", () => {
    const s = createSettingsMenuState("dark");
    expect(s.editingKey).toBe(false);
  });

  it("starts with pane badge enabled", () => {
    const s = createSettingsMenuState("dark");
    expect(s.showPaneBadge).toBe(true);
  });

  it("starts at 30fps cap", () => {
    const s = createSettingsMenuState("dark");
    expect(s.fpsCap).toBe(30);
  });

  it("starts with adaptive session refresh defaults", () => {
    const s = createSettingsMenuState("dark");
    expect(s.sessionRefreshActiveMs).toBe(15_000);
    expect(s.sessionRefreshIdleMs).toBe(60_000);
  });
});

// ── handleSettingsKey — close ─────────────────────────

describe("handleSettingsKey — close", () => {
  it("closes on Escape", () => {
    const s = makeState();
    const result = handleSettingsKey(s, "Escape");
    expect(result.action?.type).toBe("close");
  });

  it("closes on q", () => {
    const s = makeState();
    const result = handleSettingsKey(s, "q");
    expect(result.action?.type).toBe("close");
  });

  it("closes on Ctrl+C", () => {
    const s = makeState();
    const result = handleSettingsKey(s, "c", true);
    expect(result.action?.type).toBe("close");
  });
});

// ── handleSettingsKey — tab switching ────────────────

describe("handleSettingsKey — tab switching", () => {
  it("switches to theme tab on 1", () => {
    const s = makeState({ activeTab: "keys" });
    const result = handleSettingsKey(s, "1");
    expect(result.state.activeTab).toBe("theme");
    expect(result.action).toBeNull();
  });

  it("switches to keys tab on 2", () => {
    const s = makeState();
    const result = handleSettingsKey(s, "2");
    expect(result.state.activeTab).toBe("keys");
  });

  it("switches to general tab on 3", () => {
    const s = makeState();
    const result = handleSettingsKey(s, "3");
    expect(result.state.activeTab).toBe("general");
  });

  it("moves to next tab with Right arrow", () => {
    const s = makeState({ activeTab: "theme" });
    const result = handleSettingsKey(s, "Right");
    expect(result.state.activeTab).toBe("keys");
  });

  it("moves to prev tab with Left arrow", () => {
    const s = makeState({ activeTab: "keys" });
    const result = handleSettingsKey(s, "Left");
    expect(result.state.activeTab).toBe("theme");
  });

  it("clamps Left at first tab", () => {
    const s = makeState({ activeTab: "theme" });
    const result = handleSettingsKey(s, "Left");
    expect(result.state.activeTab).toBe("theme");
  });

  it("clamps Right at last tab", () => {
    const s = makeState({ activeTab: "general" });
    const result = handleSettingsKey(s, "Right");
    expect(result.state.activeTab).toBe("general");
  });

  it("SETTINGS_TABS has exactly 3 entries", () => {
    expect(SETTINGS_TABS).toHaveLength(3);
  });
});

// ── handleSettingsKey — theme tab ─────────────────────

describe("handleSettingsKey — theme tab", () => {
  it("moves selection down on j", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "dark" });
    const result = handleSettingsKey(s, "j");
    expect(result.state.selectedTheme).toBe("light");
    expect(result.action).toEqual({ type: "apply-theme", theme: "light" });
  });

  it("moves selection up on k", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "light" });
    const result = handleSettingsKey(s, "k");
    expect(result.state.selectedTheme).toBe("dark");
    expect(result.action).toEqual({ type: "apply-theme", theme: "dark" });
  });

  it("moves selection down on Down arrow", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "dark" });
    const result = handleSettingsKey(s, "Down");
    expect(result.state.selectedTheme).toBe("light");
  });

  it("moves selection up on Up arrow", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "light" });
    const result = handleSettingsKey(s, "Up");
    expect(result.state.selectedTheme).toBe("dark");
  });

  it("clamps theme selection at top", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "dark" });
    const result = handleSettingsKey(s, "k");
    expect(result.state.selectedTheme).toBe("dark");
  });

  it("clamps theme selection at bottom", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "dracula" });
    const result = handleSettingsKey(s, "j");
    expect(result.state.selectedTheme).toBe("dracula");
  });

  it("Enter confirms current theme and signals close", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "nord" });
    const result = handleSettingsKey(s, "Enter");
    expect(result.action).toEqual({ type: "apply-theme", theme: "nord", closeAfter: true });
  });

  it("emits apply-theme action immediately on move", () => {
    const s = makeState({ activeTab: "theme", selectedTheme: "dark" });
    const result = handleSettingsKey(s, "j");
    expect(result.action?.type).toBe("apply-theme");
  });
});

// ── handleSettingsKey — keys tab ──────────────────────

describe("handleSettingsKey — keys tab", () => {
  it("moves selection down on j", () => {
    const s = makeState({ activeTab: "keys", keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "j");
    expect(result.state.keySelectedIndex).toBe(1);
  });

  it("moves selection up on k", () => {
    const s = makeState({ activeTab: "keys", keySelectedIndex: 2 });
    const result = handleSettingsKey(s, "k");
    expect(result.state.keySelectedIndex).toBe(1);
  });

  it("clamps selection at 0", () => {
    const s = makeState({ activeTab: "keys", keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "k");
    expect(result.state.keySelectedIndex).toBe(0);
  });

  it("appends typed char to search", () => {
    const s = makeState({ activeTab: "keys", keySearch: "" });
    const result = handleSettingsKey(s, "a");
    expect(result.state.keySearch).toBe("a");
    expect(result.state.keySelectedIndex).toBe(0);
  });

  it("appends q to search when search already has content", () => {
    const s = makeState({ activeTab: "keys", keySearch: "qui" });
    const result = handleSettingsKey(s, "q");
    expect(result.state.keySearch).toBe("quiq");
  });

  it("q with empty search closes menu", () => {
    const s = makeState({ activeTab: "keys", keySearch: "" });
    const result = handleSettingsKey(s, "q");
    expect(result.action?.type).toBe("close");
  });

  it("Backspace removes last char from search", () => {
    const s = makeState({ activeTab: "keys", keySearch: "qui" });
    const result = handleSettingsKey(s, "Backspace");
    expect(result.state.keySearch).toBe("qu");
  });

  it("Backspace on empty search is no-op", () => {
    const s = makeState({ activeTab: "keys", keySearch: "" });
    const result = handleSettingsKey(s, "Backspace");
    expect(result.state.keySearch).toBe("");
  });

  it("Enter starts key editing", () => {
    const s = makeState({ activeTab: "keys", keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "Enter");
    expect(result.state.editingKey).toBe(true);
  });

  it("e starts key editing", () => {
    const s = makeState({ activeTab: "keys", keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "e");
    expect(result.state.editingKey).toBe(true);
  });

  it("Escape cancels editing", () => {
    const s = makeState({ activeTab: "keys", editingKey: true, keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "Escape");
    expect(result.state.editingKey).toBe(false);
    expect(result.action).toBeNull();
  });

  it("any key while editing captures new binding", () => {
    const s = makeState({ activeTab: "keys", editingKey: true, keySelectedIndex: 0 });
    const result = handleSettingsKey(s, "ctrl+q");
    expect(result.state.editingKey).toBe(false);
    expect(result.action?.type).toBe("set-key-override");
  });

  it("captures set-key-override action with correct actionId", () => {
    // First binding should be "quit"
    const s = makeState({
      activeTab: "keys",
      editingKey: true,
      keySelectedIndex: 0,
      keySearch: "",
    });
    const result = handleSettingsKey(s, "x");
    expect(result.action).toMatchObject({ type: "set-key-override", key: "x" });
  });
});

// ── handleSettingsKey — general tab ──────────────────

describe("handleSettingsKey — general tab", () => {
  it("b toggles pane badge", () => {
    const s = makeState({ activeTab: "general", showPaneBadge: true });
    const result = handleSettingsKey(s, "b");
    expect(result.state.showPaneBadge).toBe(false);
    expect(result.action?.type).toBe("update-general");
  });

  it("b toggles pane badge back on", () => {
    const s = makeState({ activeTab: "general", showPaneBadge: false });
    const result = handleSettingsKey(s, "b");
    expect(result.state.showPaneBadge).toBe(true);
  });

  it("f cycles fps cap", () => {
    const s = makeState({ activeTab: "general", fpsCap: 30 });
    const result = handleSettingsKey(s, "f");
    expect(FPS_OPTIONS).toContain(result.state.fpsCap);
    expect(result.state.fpsCap).not.toBe(30);
    expect(result.action?.type).toBe("update-general");
  });

  it("a cycles active refresh interval", () => {
    const s = makeState({ activeTab: "general", sessionRefreshActiveMs: 10_000 });
    const result = handleSettingsKey(s, "a");
    expect(result.state.sessionRefreshActiveMs).toBe(15_000);
    expect(result.action?.type).toBe("update-general");
  });

  it("i cycles idle refresh interval", () => {
    const s = makeState({ activeTab: "general", sessionRefreshIdleMs: 30_000 });
    const result = handleSettingsKey(s, "i");
    expect(result.state.sessionRefreshIdleMs).toBe(60_000);
    expect(result.action?.type).toBe("update-general");
  });

  it("f cycles through all fps options", () => {
    let s = makeState({ activeTab: "general", fpsCap: 15 });
    const seen = new Set<number>();
    for (let i = 0; i < FPS_OPTIONS.length; i++) {
      const result = handleSettingsKey(s, "f");
      seen.add(result.state.fpsCap);
      s = result.state;
    }
    expect(seen.size).toBe(FPS_OPTIONS.length);
  });

  it("unknown key is no-op", () => {
    const s = makeState({ activeTab: "general" });
    const result = handleSettingsKey(s, "z");
    expect(result.state).toEqual(s);
    expect(result.action).toBeNull();
  });
});

// ── renderSettingsMenu ────────────────────────────────

describe("renderSettingsMenu", () => {
  it("returns a modal node", () => {
    const s = makeState();
    const vnode = renderSettingsMenu(mockUi, s, {}) as { type: string };
    expect(vnode.type).toBe("modal");
  });

  it("title contains 'Settings'", () => {
    const s = makeState();
    const vnode = renderSettingsMenu(mockUi, s, {}) as unknown as { props: { title: string } };
    expect(vnode.props.title).toContain("Settings");
  });

  it("renders without throwing for all tabs", () => {
    for (const tab of SETTINGS_TABS) {
      const s = makeState({ activeTab: tab });
      expect(() => renderSettingsMenu(mockUi, s, {})).not.toThrow();
    }
  });

  it("renders without throwing during key edit mode", () => {
    const s = makeState({ activeTab: "keys", editingKey: true, keySelectedIndex: 0 });
    expect(() => renderSettingsMenu(mockUi, s, {})).not.toThrow();
  });

  it("renders with key overrides provided", () => {
    const s = makeState({ activeTab: "keys" });
    expect(() => renderSettingsMenu(mockUi, s, { quit: "ctrl+q" })).not.toThrow();
  });
});
