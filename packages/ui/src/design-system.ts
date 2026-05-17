/**
 * ai-tools Design System
 *
 * A comprehensive design system for the TUI that ensures:
 * 1. Consistent colors everywhere (no hardcoded blacks)
 * 2. Proper layout sizing
 * 3. Smart container borders
 * 4. Unified component styling
 *
 * All color-producing functions read from the active theme context
 * so they respond correctly to light, dimmed, nord, etc. themes.
 */

import type { RgbColor } from "./theme.js";
import {
  // Static default tokens (re-exported for backward compat)
  BRAND,
  STATUS,
  SURFACE,
  TEXT,

  // Theme-aware helpers
  getActiveTokens,

  // Powerline (now functions)
  PL_HEALTH_BG_OK,
  PL_HEALTH_BG_WARN,
  PL_HEALTH_BG_ERR,
  PL_HINTS_BG,

  // Helper functions
  dimColor,
  tintBg,
  lerpColor,
  glowColor,

  // Icon system
  getIconChar,
} from "./theme.js";

export {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  dimColor,
  tintBg,
  lerpColor,
  glowColor,
  PL_HEALTH_BG_OK,
  PL_HEALTH_BG_WARN,
  PL_HEALTH_BG_ERR,
  PL_HINTS_BG,
};

// ─────────────────────────────────────────────────────────────
// CONTAINER SYSTEM
// ─────────────────────────────────────────────────────────────

export type ContainerVariant = "default" | "elevated" | "overlay" | "card";

export type BorderStyle = "none" | "subtle" | "accent" | "active";

export type ContainerConfig = {
  /** Background color */
  bg: RgbColor;
  /** Border color */
  borderColor: RgbColor;
  /** Text color */
  fg: RgbColor;
  /** Secondary text color */
  fgSecondary: RgbColor;
  /** Tertiary text color */
  fgTertiary: RgbColor;
};

/**
 * Get container configuration based on variant.
 * Reads from the active theme so light/dark/nord etc. are all correct.
 */
export function getContainerConfig(variant: ContainerVariant): ContainerConfig {
  const tokens = getActiveTokens();
  switch (variant) {
    case "elevated":
      return {
        bg: tokens.surface.elevated,
        borderColor: tokens.border.subtle,
        fg: tokens.text.primary,
        fgSecondary: tokens.text.secondary,
        fgTertiary: tokens.text.tertiary,
      };
    case "overlay":
      return {
        bg: tokens.surface.overlay,
        borderColor: tokens.border.default,
        fg: tokens.text.primary,
        fgSecondary: tokens.text.secondary,
        fgTertiary: tokens.text.tertiary,
      };
    case "card":
      return {
        bg: tokens.surface.card,
        borderColor: tokens.border.subtle,
        fg: tokens.text.primary,
        fgSecondary: tokens.text.secondary,
        fgTertiary: tokens.text.tertiary,
      };
    case "default":
    default:
      return {
        bg: tokens.surface.base,
        borderColor: tokens.border.subtle,
        fg: tokens.text.primary,
        fgSecondary: tokens.text.secondary,
        fgTertiary: tokens.text.tertiary,
      };
  }
}

// ─────────────────────────────────────────────────────────────
// COMPONENT STYLES
// ─────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

export type ProgressVariant = "blocks" | "line" | "gradient";

export interface ButtonStyle {
  fg: RgbColor;
  bg: RgbColor;
  bold: boolean;
}

export interface BadgeStyle {
  fg: RgbColor;
  bg: RgbColor;
}

/**
 * Get button styles based on variant.
 * Theme-aware: tintBg reads from the active theme's surface.
 */
export function getButtonStyle(variant: ButtonVariant): ButtonStyle {
  const tokens = getActiveTokens();
  switch (variant) {
    case "primary":
      return {
        fg: tokens.text.primary,
        bg: tintBg(tokens.brand.base, 0.2),
        bold: true,
      };
    case "secondary":
      return {
        fg: tokens.text.secondary,
        bg: tokens.surface.elevated,
        bold: false,
      };
    case "ghost":
      return {
        fg: tokens.text.secondary,
        bg: tokens.surface.base,
        bold: false,
      };
    case "danger":
      return {
        fg: tokens.status.error,
        bg: tintBg(tokens.status.error, 0.15),
        bold: true,
      };
  }
}

/**
 * Get badge styles based on variant.
 * Theme-aware: uses active tokens for colors and tintBg for backgrounds.
 */
export function getBadgeStyle(variant: BadgeVariant): BadgeStyle {
  const tokens = getActiveTokens();
  switch (variant) {
    case "success":
      return { fg: tokens.status.success, bg: tintBg(tokens.status.success, 0.15) };
    case "warning":
      return { fg: tokens.status.warning, bg: tintBg(tokens.status.warning, 0.15) };
    case "error":
      return { fg: tokens.status.error, bg: tintBg(tokens.status.error, 0.15) };
    case "info":
      return { fg: tokens.status.info, bg: tintBg(tokens.status.info, 0.15) };
    case "neutral":
      return { fg: tokens.text.secondary, bg: tokens.surface.elevated };
  }
}

// ─────────────────────────────────────────────────────────────
// TABLE SYSTEM
// ─────────────────────────────────────────────────────────────

export type TableConfig = {
  /** Column configurations */
  columns: ColumnConfig[];
  /** Row height */
  rowHeight: number;
  /** Header height */
  headerHeight: number;
  /** Zebra striping enabled */
  zebraStriping: boolean;
  /** Selection enabled */
  selection: boolean;
};

export type ColumnConfig = {
  /** Column key/ID */
  key: string;
  /** Display label */
  label: string;
  /** Minimum width */
  minWidth: number;
  /** Maximum width */
  maxWidth?: number;
  /** Flex grow factor */
  flexGrow?: number;
  /** Text alignment */
  align?: "left" | "center" | "right";
};

/**
 * Default table configurations
 */
export const TABLES = {
  sessions: {
    columns: [
      { key: "tool", label: "Tool", minWidth: 14 },
      { key: "title", label: "Title", minWidth: 30, flexGrow: 1 },
      { key: "messages", label: "Msgs", minWidth: 6, align: "right" as const },
      { key: "updated", label: "Updated", minWidth: 12, align: "right" as const },
    ],
    rowHeight: 1,
    headerHeight: 1,
    zebraStriping: true,
    selection: true,
  },
  tools: {
    columns: [
      { key: "name", label: "Tool", minWidth: 20, flexGrow: 1 },
      { key: "status", label: "Status", minWidth: 14 },
      { key: "sessions", label: "Sessions", minWidth: 10, align: "right" as const },
    ],
    rowHeight: 3,
    headerHeight: 0,
    zebraStriping: false,
    selection: true,
  },
  config: {
    columns: [
      { key: "engine", label: "Engine", minWidth: 20, flexGrow: 1 },
      { key: "status", label: "Status", minWidth: 20 },
    ],
    rowHeight: 1,
    headerHeight: 1,
    zebraStriping: true,
    selection: false,
  },
};

// ─────────────────────────────────────────────────────────────
// STATUS COLORS
// ─────────────────────────────────────────────────────────────

export interface StatusConfig {
  color: RgbColor;
  bg: RgbColor;
  icon: string;
  label: string;
}

/**
 * Get status configuration with theme-aware colors.
 * Powerline background getters (PL_HEALTH_BG_*) are now functions
 * that derive from the active theme.
 */
export function getStatusConfig(status: string): StatusConfig {
  const s = status.toLowerCase();
  const tokens = getActiveTokens();

  if (s === "healthy" || s === "ok" || s === "available" || s === "configured") {
    return {
      color: tokens.status.success,
      bg: PL_HEALTH_BG_OK(),
      icon: getIconChar("status.active"),
      label: "healthy",
    };
  }

  if (s === "stale" || s === "warning" || s === "stopped") {
    return {
      color: tokens.status.warning,
      bg: PL_HEALTH_BG_WARN(),
      icon: "\u25D0",
      label: "warning",
    };
  }

  if (s === "error" || s === "unhealthy" || s === "not-installed") {
    return {
      color: tokens.status.error,
      bg: PL_HEALTH_BG_ERR(),
      icon: getIconChar("status.error"),
      label: "error",
    };
  }

  // Default/neutral
  return {
    color: tokens.text.secondary,
    bg: PL_HINTS_BG(),
    icon: getIconChar("status.pending"),
    label: "unknown",
  };
}

// ─────────────────────────────────────────────────────────────
// ICONS & SYMBOLS
// ─────────────────────────────────────────────────────────────

export const ICONS = {
  // Status indicators
  success: getIconChar("status.success"),
  error: getIconChar("status.error"),
  warning: getIconChar("status.warning"),
  info: getIconChar("status.info"),

  // Navigation
  selected: getIconChar("select.selected"),
  unselected: getIconChar("select.unselected"),
  collapsed: getIconChar("select.collapsed"),
  expanded: getIconChar("select.expanded"),

  // Actions
  launch: getIconChar("action.launch"),
  kill: getIconChar("status.stopped"),
  refresh: getIconChar("action.refresh"),
  search: getIconChar("action.search"),
  close: getIconChar("nav.close"),
  back: "\u21B5",

  // Misc
  bullet: getIconChar("ui.bullet"),
  diamond: getIconChar("brand.logo"),
  star: "\u2605",
  folder: getIconChar("session.folder"),
  file: getIconChar("session.file"),
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create a consistent text style with proper hierarchy.
 * Theme-aware: reads from active tokens.
 */
export function textStyle(variant: "primary" | "secondary" | "tertiary" | "muted"): {
  fg: RgbColor;
  bold?: boolean;
  italic?: boolean;
} {
  const tokens = getActiveTokens();
  switch (variant) {
    case "primary":
      return { fg: tokens.text.primary, bold: true };
    case "secondary":
      return { fg: tokens.text.secondary };
    case "tertiary":
      return { fg: tokens.text.tertiary };
    case "muted":
      return { fg: tokens.text.tertiary, italic: true };
  }
}

/**
 * Get selection background with brand tint.
 * Theme-aware: tintBg uses the active theme's surface.
 */
export function selectionBackground(brandColor?: RgbColor): RgbColor {
  if (brandColor) {
    return tintBg(brandColor, 0.22);
  }
  return getActiveTokens().surface.subtle;
}

/**
 * Get zebra stripe background.
 * Theme-aware: reads from active tokens.
 */
export function zebraBackground(isOdd: boolean): RgbColor | undefined {
  return isOdd ? getActiveTokens().surface.elevated : undefined;
}
