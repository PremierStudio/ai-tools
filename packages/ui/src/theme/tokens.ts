/**
 * Semantic Theme Tokens for Agentful TUI
 *
 * This module defines color tokens that map to Rezi's semantic theme system.
 * Colors are organized by semantic meaning rather than visual appearance.
 *
 * @see https://rezitui.dev/docs/styling/theme
 */

import type { RgbColor } from "../theme.js";

// ─────────────────────────────────────────────────────────────
// RAW COLOR PALETTE (Internal - use semantic tokens in views)
// ─────────────────────────────────────────────────────────────

/** Brand gradient colors */
export const BRAND = {
  /** Primary teal */
  primary: { r: 16, g: 185, b: 129 } as RgbColor,
  /** Secondary cyan */
  secondary: { r: 6, g: 182, b: 212 } as RgbColor,
  /** Accent bright cyan */
  accent: { r: 34, g: 211, b: 238 } as RgbColor,
  /** Base mid-teal */
  base: { r: 11, g: 184, b: 170 } as RgbColor,
};

/** Status colors */
export const STATUS = {
  success: { r: 52, g: 211, b: 153 } as RgbColor,
  warning: { r: 253, g: 224, b: 133 } as RgbColor,
  error: { r: 248, g: 113, b: 113 } as RgbColor,
  info: { r: 96, g: 165, b: 250 } as RgbColor,
  neutral: { r: 148, g: 163, b: 184 } as RgbColor,
};

/** Background surface colors */
export const SURFACE = {
  /** Deepest background - app root */
  deep: { r: 8, g: 10, b: 18 } as RgbColor,
  /** Base surface - panels, cards */
  base: { r: 13, g: 17, b: 27 } as RgbColor,
  /** Elevated surface - selected items, modals */
  elevated: { r: 20, g: 28, b: 46 } as RgbColor,
  /** Overlay surface - dropdowns, tooltips */
  overlay: { r: 15, g: 20, b: 35 } as RgbColor,
  /** Subtle highlight - hover states */
  subtle: { r: 17, g: 24, b: 39 } as RgbColor,
  /** Card background */
  card: { r: 24, g: 28, b: 42 } as RgbColor,
};

/** Text colors */
export const TEXT = {
  /** Primary text - bright white */
  primary: { r: 226, g: 232, b: 240 } as RgbColor,
  /** Secondary text - muted gray */
  secondary: { r: 148, g: 163, b: 184 } as RgbColor,
  /** Tertiary text - dim gray */
  tertiary: { r: 100, g: 116, b: 139 } as RgbColor,
  /** Disabled text */
  disabled: { r: 75, g: 85, b: 99 } as RgbColor,
};

/** Border colors */
export const BORDER = {
  /** Subtle borders - dividers */
  subtle: { r: 51, g: 65, b: 85 } as RgbColor,
  /** Default borders */
  default: { r: 75, g: 85, b: 99 } as RgbColor,
  /** Strong borders - active elements */
  strong: { r: 99, g: 179, b: 237 } as RgbColor,
};

/** Tool-specific brand colors */
export const TOOLS = {
  claude: { r: 250, g: 160, b: 50 } as RgbColor,
  codex: STATUS.success,
  gemini: STATUS.info,
  cursor: { r: 180, g: 130, b: 255 } as RgbColor,
  opencode: { r: 100, g: 220, b: 200 } as RgbColor,
  amp: { r: 255, g: 140, b: 100 } as RgbColor,
  cline: { r: 160, g: 100, b: 255 } as RgbColor,
};

// ─────────────────────────────────────────────────────────────
// SEMANTIC TOKEN MAPPING (For Rezi Theme System)
// ─────────────────────────────────────────────────────────────

/**
 * Maps our semantic colors to Rezi's theme token structure.
 * This is used with extendTheme() to create custom themes.
 */
export const SEMANTIC_TOKENS = {
  // Surface colors (bg.*)
  "bg.base": SURFACE.base,
  "bg.elevated": SURFACE.elevated,
  "bg.overlay": SURFACE.overlay,
  "bg.subtle": SURFACE.subtle,

  // Foreground colors (fg.*)
  "fg.primary": TEXT.primary,
  "fg.secondary": TEXT.secondary,
  "fg.muted": TEXT.tertiary,

  // Accent colors (accent.*)
  "accent.primary": BRAND.primary,
  "accent.secondary": BRAND.secondary,
  "accent.tertiary": BRAND.accent,

  // Semantic state colors
  success: STATUS.success,
  warning: STATUS.warning,
  error: STATUS.error,
  info: STATUS.info,

  // Border colors (border.*)
  "border.subtle": BORDER.subtle,
  "border.default": BORDER.default,
  "border.strong": BORDER.strong,

  // Focus colors
  "focus.ring": BRAND.accent,
  "focus.bg": SURFACE.subtle,

  // Selection colors
  "selected.bg": SURFACE.elevated,
  "selected.fg": TEXT.primary,

  // Disabled state
  "disabled.fg": TEXT.disabled,
  "disabled.bg": SURFACE.base,
};

// ─────────────────────────────────────────────────────────────
// THEME-SPECIFIC OVERRIDES
// ─────────────────────────────────────────────────────────────

/** Dark theme adjustments (default) */
export const DARK_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: SURFACE.deep,
      elevated: SURFACE.elevated,
      overlay: SURFACE.overlay,
      subtle: SURFACE.subtle,
    },
    fg: {
      primary: TEXT.primary,
      secondary: TEXT.secondary,
      muted: TEXT.tertiary,
    },
    accent: {
      primary: BRAND.primary,
      secondary: BRAND.secondary,
      tertiary: BRAND.accent,
    },
    success: STATUS.success,
    warning: STATUS.warning,
    error: STATUS.error,
    info: STATUS.info,
    border: {
      subtle: BORDER.subtle,
      default: BORDER.default,
      strong: BORDER.strong,
    },
    focus: {
      ring: BRAND.accent,
      bg: SURFACE.subtle,
    },
    selected: {
      bg: SURFACE.elevated,
      fg: TEXT.primary,
    },
    disabled: {
      fg: TEXT.disabled,
      bg: SURFACE.base,
    },
  },
};

/** Light theme adjustments */
export const LIGHT_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 250, g: 250, b: 252 },
      elevated: { r: 255, g: 255, b: 255 },
      overlay: { r: 245, g: 245, b: 247 },
      subtle: { r: 240, g: 240, b: 242 },
    },
    fg: {
      primary: { r: 15, g: 23, b: 42 },
      secondary: { r: 71, g: 85, b: 105 },
      muted: { r: 100, g: 116, b: 139 },
    },
    accent: {
      primary: { r: 13, g: 148, b: 136 },
      secondary: { r: 8, g: 145, b: 178 },
      tertiary: { r: 6, g: 182, b: 212 },
    },
    border: {
      subtle: { r: 226, g: 232, b: 240 },
      default: { r: 203, g: 213, b: 225 },
      strong: { r: 148, g: 163, b: 184 },
    },
    focus: {
      ring: { r: 6, g: 182, b: 212 },
      bg: { r: 240, g: 249, b: 255 },
    },
    selected: {
      bg: { r: 224, g: 242, b: 254 },
      fg: { r: 15, g: 23, b: 42 },
    },
  },
};

/** Dimmed theme - lower contrast dark */
export const DIMMED_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 30, g: 30, b: 35 },
      elevated: { r: 40, g: 40, b: 45 },
      overlay: { r: 35, g: 35, b: 40 },
      subtle: { r: 45, g: 45, b: 50 },
    },
    fg: {
      primary: { r: 200, g: 200, b: 205 },
      secondary: { r: 150, g: 150, b: 155 },
      muted: { r: 110, g: 110, b: 115 },
    },
    accent: {
      primary: { r: 100, g: 150, b: 140 },
      secondary: { r: 90, g: 140, b: 160 },
      tertiary: { r: 120, g: 170, b: 190 },
    },
    border: {
      subtle: { r: 60, g: 60, b: 65 },
      default: { r: 80, g: 80, b: 85 },
      strong: { r: 100, g: 100, b: 110 },
    },
    focus: {
      ring: { r: 120, g: 170, b: 190 },
      bg: { r: 50, g: 50, b: 55 },
    },
  },
};

/** Nord theme - blue-grey palette */
export const NORD_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 46, g: 52, b: 64 },
      elevated: { r: 59, g: 66, b: 82 },
      overlay: { r: 67, g: 76, b: 94 },
      subtle: { r: 76, g: 86, b: 106 },
    },
    fg: {
      primary: { r: 236, g: 239, b: 244 },
      secondary: { r: 216, g: 222, b: 233 },
      muted: { r: 143, g: 188, b: 187 },
    },
    accent: {
      primary: { r: 136, g: 192, b: 208 },
      secondary: { r: 129, g: 161, b: 193 },
      tertiary: { r: 94, g: 129, b: 172 },
    },
    success: { r: 163, g: 190, b: 140 },
    warning: { r: 235, g: 203, b: 139 },
    error: { r: 191, g: 97, b: 106 },
    info: { r: 136, g: 192, b: 208 },
    border: {
      subtle: { r: 67, g: 76, b: 94 },
      default: { r: 76, g: 86, b: 106 },
      strong: { r: 136, g: 192, b: 208 },
    },
    focus: {
      ring: { r: 136, g: 192, b: 208 },
      bg: { r: 67, g: 76, b: 94 },
    },
  },
};

/** Dracula theme - purple/magenta dark */
export const DRACULA_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 40, g: 42, b: 54 },
      elevated: { r: 68, g: 71, b: 90 },
      overlay: { r: 56, g: 58, b: 74 },
      subtle: { r: 75, g: 78, b: 98 },
    },
    fg: {
      primary: { r: 248, g: 248, b: 242 },
      secondary: { r: 189, g: 147, b: 249 },
      muted: { r: 98, g: 114, b: 164 },
    },
    accent: {
      primary: { r: 189, g: 147, b: 249 },
      secondary: { r: 139, g: 233, b: 253 },
      tertiary: { r: 255, g: 121, b: 198 },
    },
    success: { r: 80, g: 250, b: 123 },
    warning: { r: 241, g: 250, b: 140 },
    error: { r: 255, g: 85, b: 85 },
    info: { r: 139, g: 233, b: 253 },
    border: {
      subtle: { r: 68, g: 71, b: 90 },
      default: { r: 98, g: 114, b: 164 },
      strong: { r: 189, g: 147, b: 249 },
    },
    focus: {
      ring: { r: 255, g: 121, b: 198 },
      bg: { r: 68, g: 71, b: 90 },
    },
  },
};

/** High contrast theme - WCAG AAA compliant */
export const HIGH_CONTRAST_THEME_OVERRIDES = {
  colors: {
    bg: {
      base: { r: 0, g: 0, b: 0 },
      elevated: { r: 20, g: 20, b: 20 },
      overlay: { r: 30, g: 30, b: 30 },
      subtle: { r: 40, g: 40, b: 40 },
    },
    fg: {
      primary: { r: 255, g: 255, b: 255 },
      secondary: { r: 200, g: 200, b: 200 },
      muted: { r: 150, g: 150, b: 150 },
    },
    accent: {
      primary: { r: 0, g: 255, b: 255 },
      secondary: { r: 255, g: 255, b: 0 },
      tertiary: { r: 255, g: 0, b: 255 },
    },
    success: { r: 0, g: 255, b: 0 },
    warning: { r: 255, g: 255, b: 0 },
    error: { r: 255, g: 0, b: 0 },
    info: { r: 0, g: 255, b: 255 },
    border: {
      subtle: { r: 100, g: 100, b: 100 },
      default: { r: 150, g: 150, b: 150 },
      strong: { r: 255, g: 255, b: 255 },
    },
    focus: {
      ring: { r: 255, g: 255, b: 0 },
      bg: { r: 50, g: 50, b: 50 },
    },
  },
};
