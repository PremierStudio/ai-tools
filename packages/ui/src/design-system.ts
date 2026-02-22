/**
 * Agentful Design System
 *
 * A comprehensive design system for the TUI that ensures:
 * 1. Consistent colors everywhere (no hardcoded blacks)
 * 2. Proper layout sizing
 * 3. Smart container borders
 * 4. Unified component styling
 */

import type { RgbColor } from "./theme.js";
import {
  // Semantic tokens
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  BORDER,

  // Powerline (app-specific)
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
 * Get container configuration based on variant
 */
export function getContainerConfig(variant: ContainerVariant): ContainerConfig {
  switch (variant) {
    case "elevated":
      return {
        bg: SURFACE.elevated,
        borderColor: BORDER.subtle,
        fg: TEXT.primary,
        fgSecondary: TEXT.secondary,
        fgTertiary: TEXT.tertiary,
      };
    case "overlay":
      return {
        bg: SURFACE.overlay,
        borderColor: BORDER.default,
        fg: TEXT.primary,
        fgSecondary: TEXT.secondary,
        fgTertiary: TEXT.tertiary,
      };
    case "card":
      return {
        bg: SURFACE.card,
        borderColor: BORDER.subtle,
        fg: TEXT.primary,
        fgSecondary: TEXT.secondary,
        fgTertiary: TEXT.tertiary,
      };
    case "default":
    default:
      return {
        bg: SURFACE.base,
        borderColor: BORDER.subtle,
        fg: TEXT.primary,
        fgSecondary: TEXT.secondary,
        fgTertiary: TEXT.tertiary,
      };
  }
}

// ─────────────────────────────────────────────────────────────
// LAYOUT SYSTEM
// ─────────────────────────────────────────────────────────────

export type LayoutConfig = {
  /** Minimum sidebar width */
  sidebarMinWidth: number;
  /** Maximum sidebar width */
  sidebarMaxWidth: number;
  /** Content minimum width */
  contentMinWidth: number;
  /** Standard padding */
  padding: number;
  /** Compact padding */
  paddingCompact: number;
  /** Gap between elements */
  gap: number;
  /** Gap between elements (compact) */
  gapCompact: number;
};

export const LAYOUT: LayoutConfig = {
  sidebarMinWidth: 22,
  sidebarMaxWidth: 26,
  contentMinWidth: 60,
  padding: 1,
  paddingCompact: 0,
  gap: 1,
  gapCompact: 0,
};

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
 * Get button styles based on variant
 */
export function getButtonStyle(variant: ButtonVariant): ButtonStyle {
  switch (variant) {
    case "primary":
      return {
        fg: TEXT.primary,
        bg: tintBg(BRAND.base, 0.2),
        bold: true,
      };
    case "secondary":
      return {
        fg: TEXT.secondary,
        bg: SURFACE.elevated,
        bold: false,
      };
    case "ghost":
      return {
        fg: TEXT.secondary,
        bg: SURFACE.base,
        bold: false,
      };
    case "danger":
      return {
        fg: STATUS.error,
        bg: tintBg(STATUS.error, 0.15),
        bold: true,
      };
  }
}

/**
 * Get badge styles based on variant
 */
export function getBadgeStyle(variant: BadgeVariant): BadgeStyle {
  switch (variant) {
    case "success":
      return { fg: STATUS.success, bg: tintBg(STATUS.success, 0.15) };
    case "warning":
      return { fg: STATUS.warning, bg: tintBg(STATUS.warning, 0.15) };
    case "error":
      return { fg: STATUS.error, bg: tintBg(STATUS.error, 0.15) };
    case "info":
      return { fg: STATUS.info, bg: tintBg(STATUS.info, 0.15) };
    case "neutral":
      return { fg: TEXT.secondary, bg: SURFACE.elevated };
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

export function getStatusConfig(status: string): StatusConfig {
  const s = status.toLowerCase();

  if (s === "healthy" || s === "ok" || s === "available" || s === "configured") {
    return {
      color: STATUS.success,
      bg: PL_HEALTH_BG_OK,
      icon: getIconChar("status.active"),
      label: "healthy",
    };
  }

  if (s === "stale" || s === "warning" || s === "stopped") {
    return {
      color: STATUS.warning,
      bg: PL_HEALTH_BG_WARN,
      icon: "◐",
      label: "warning",
    };
  }

  if (s === "error" || s === "unhealthy" || s === "not-installed") {
    return {
      color: STATUS.error,
      bg: PL_HEALTH_BG_ERR,
      icon: getIconChar("status.error"),
      label: "error",
    };
  }

  // Default/neutral
  return {
    color: TEXT.secondary,
    bg: PL_HINTS_BG,
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
  back: "↵",

  // Misc
  bullet: getIconChar("ui.bullet"),
  diamond: getIconChar("brand.logo"),
  star: "★",
  folder: getIconChar("session.folder"),
  file: getIconChar("session.file"),
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create a consistent text style with proper hierarchy
 */
export function textStyle(variant: "primary" | "secondary" | "tertiary" | "muted"): {
  fg: RgbColor;
  bold?: boolean;
  italic?: boolean;
} {
  switch (variant) {
    case "primary":
      return { fg: TEXT.primary, bold: true };
    case "secondary":
      return { fg: TEXT.secondary };
    case "tertiary":
      return { fg: TEXT.tertiary };
    case "muted":
      return { fg: TEXT.tertiary, italic: true };
  }
}

/**
 * Get selection background with brand tint
 */
export function selectionBackground(brandColor?: RgbColor): RgbColor {
  if (brandColor) {
    return tintBg(brandColor, 0.12);
  }
  return SURFACE.subtle;
}

/**
 * Get zebra stripe background
 */
export function zebraBackground(isOdd: boolean): RgbColor | undefined {
  return isOdd ? SURFACE.elevated : undefined;
}
