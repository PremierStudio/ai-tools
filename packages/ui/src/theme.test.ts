import { describe, expect, it } from "vitest";

import {
  ACTION_PRIMARY_BG,
  ACTION_SECONDARY_BG,
  COLOR_SEPARATOR,
  COLOR_SEPARATOR_DIM,
  FOCUS_GLOW,
  PL_CONFIG_BG,
  PL_HEALTH_BG_ERR,
  PL_HEALTH_BG_OK,
  PL_HEALTH_BG_WARN,
  PL_HINTS_BG,
  PL_MODE_BG,
  PL_RUNNING_BG,
  PL_SESSIONS_BG,
  PL_TOOLS_BG,
  SEARCH_HIGHLIGHT_BG,
  TOAST_ERROR_BG,
  TOAST_INFO_BG,
  TOAST_SUCCESS_BG,
  chipBg,
  cycleTheme,
  darkenColor,
  dimColor,
  getActiveThemeId,
  getTheme,
  glowColor,
  gradientStops,
  lerpColor,
  mixColor,
  selBg,
  selectionBg,
  tintBg,
} from "./theme.js";

describe("theme color utilities", () => {
  const start = { r: 0, g: 10, b: 20 };
  const end = { r: 100, g: 110, b: 120 };

  it("interpolates and generates gradients", () => {
    expect(lerpColor(start, end, 0.5)).toEqual({ r: 50, g: 60, b: 70 });
    expect(gradientStops(start, end, 1)).toEqual([start]);
    expect(gradientStops(start, end, 3)).toEqual([start, { r: 50, g: 60, b: 70 }, end]);
  });

  it("dims, mixes, glows, and darkens colors", () => {
    expect(dimColor({ r: 100, g: 50, b: 25 }, 0.4)).toEqual({ r: 40, g: 20, b: 10 });
    expect(mixColor(start, end, 0.25)).toEqual({ r: 25, g: 35, b: 45 });
    expect(glowColor({ r: 250, g: 100, b: 0 }, 0.5)).toEqual({ r: 253, g: 178, b: 128 });
    expect(darkenColor({ r: 100, g: 50, b: 25 }, 0.2)).toEqual({ r: 80, g: 40, b: 20 });
  });

  it("uses the active theme for tinted backgrounds", () => {
    getTheme("dark");
    const darkTint = tintBg({ r: 255, g: 255, b: 255 }, 0.2);

    getTheme("light");
    const lightTint = tintBg({ r: 255, g: 255, b: 255 }, 0.2);

    expect(getActiveThemeId()).toBe("light");
    expect(darkTint).not.toEqual(lightTint);
    expect(selectionBg({ r: 200, g: 100, b: 50 })).toEqual(
      expect.objectContaining({
        r: expect.any(Number),
        g: expect.any(Number),
        b: expect.any(Number),
      }),
    );
  });

  it("cycles theme names with fallback behavior", () => {
    expect(cycleTheme("dark")).toBe("light");
    expect(cycleTheme("dracula")).toBe("dark");
    expect(getTheme("missing-theme")).toBe(getTheme("dark"));
  });

  it("returns theme-aware app color helpers", () => {
    const helpers = [
      PL_MODE_BG,
      PL_HEALTH_BG_OK,
      PL_HEALTH_BG_WARN,
      PL_HEALTH_BG_ERR,
      PL_SESSIONS_BG,
      PL_RUNNING_BG,
      PL_HINTS_BG,
      PL_TOOLS_BG,
      PL_CONFIG_BG,
      TOAST_SUCCESS_BG,
      TOAST_ERROR_BG,
      TOAST_INFO_BG,
      SEARCH_HIGHLIGHT_BG,
      ACTION_PRIMARY_BG,
      ACTION_SECONDARY_BG,
      COLOR_SEPARATOR,
      COLOR_SEPARATOR_DIM,
      FOCUS_GLOW,
    ];

    for (const helper of helpers) {
      expect(helper()).toEqual(
        expect.objectContaining({
          r: expect.any(Number),
          g: expect.any(Number),
          b: expect.any(Number),
        }),
      );
    }
  });

  it("returns selection and chip colors from brand colors", () => {
    expect(selBg({ r: 20, g: 40, b: 60 })).toEqual(
      expect.objectContaining({
        r: expect.any(Number),
        g: expect.any(Number),
        b: expect.any(Number),
      }),
    );
    expect(chipBg({ r: 20, g: 40, b: 60 })).toEqual({ r: 6, g: 12, b: 18 });
  });
});
