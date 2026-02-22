import { describe, it, expect, vi } from "vitest";
import { buildDashboardKeyHandlers } from "./keybindings.js";

describe("buildDashboardKeyHandlers", () => {
  it("includes non-overridable base navigation keys", () => {
    const bindKey = vi.fn().mockImplementation(() => vi.fn());

    const handlers = buildDashboardKeyHandlers(bindKey, {});

    expect(handlers["j"]).toBeDefined();
    expect(handlers["k"]).toBeDefined();
    expect(handlers["Down"]).toBeDefined();
    expect(handlers["Up"]).toBeDefined();
    expect(handlers["Enter"]).toBeDefined();
    expect(handlers["Escape"]).toBeDefined();
    expect(handlers["Left"]).toBeDefined();
    expect(handlers["Right"]).toBeDefined();
  });

  it("uses defaults when no overrides are provided", () => {
    const bindKey = vi.fn().mockImplementation(() => vi.fn());

    const handlers = buildDashboardKeyHandlers(bindKey, {});

    expect(handlers["q"]).toBeDefined();
    expect(handlers["Tab"]).toBeDefined();
    expect(handlers["shift+Tab"]).toBeDefined();
    expect(handlers["1"]).toBeDefined();
    expect(handlers["2"]).toBeDefined();
    expect(handlers["3"]).toBeDefined();
    expect(handlers["4"]).toBeDefined();
  });

  it("applies custom key overrides for overridable actions", () => {
    const bindKey = vi.fn().mockImplementation(() => vi.fn());

    const handlers = buildDashboardKeyHandlers(bindKey, {
      quit: "x",
      "config-refresh": "R",
    });

    expect(handlers["x"]).toBeDefined();
    expect(handlers["q"]).toBeUndefined();
    expect(handlers["R"]).toBeDefined();
    expect(handlers["r"]).toBeUndefined();
  });

  it("falls back to defaults when override format is unsupported", () => {
    const bindKey = vi.fn().mockImplementation(() => vi.fn());

    const handlers = buildDashboardKeyHandlers(bindKey, {
      "sessions-search": "x / y",
    });

    expect(handlers["/"]).toBeDefined();
    expect(handlers["x / y"]).toBeUndefined();
  });

  it("falls back to safe defaults for restricted bindings", () => {
    const bindKey = vi.fn().mockImplementation(() => vi.fn());

    const handlers = buildDashboardKeyHandlers(bindKey, {
      "quit-ctrl": "x",
      "tab-prev": "BackTab",
    });

    expect(handlers["ctrl+c"]).toBeDefined();
    expect(handlers["x"]).toBeUndefined();
    expect(handlers["shift+Tab"]).toBeDefined();
    expect(handlers["BackTab"]).toBeUndefined();
  });
});
