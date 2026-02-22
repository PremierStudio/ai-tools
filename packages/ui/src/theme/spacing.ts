/**
 * Spacing System for Agentful TUI
 *
 * Implements Rezi's spacing scale for consistent layouts.
 * All spacing values should use these tokens instead of hardcoded numbers.
 *
 * Rezi Spacing Scale:
 *   "none" | 0  - No spacing
 *   "xs"   | 1  - Tight spacing (icon gaps, inline elements)
 *   "sm"   | 1  - Compact elements (list items, buttons)
 *   "md"   | 2  - Default spacing (cards, panels)
 *   "lg"   | 3  - Sections (content areas)
 *   "xl"   | 4  - Major sections (page margins)
 *   "2xl"  | 6  - Page margins, major divisions
 *
 * @see https://rezitui.dev/docs/styling/style-props
 */

// ─────────────────────────────────────────────────────────────
// SPACING SCALE TYPE
// ─────────────────────────────────────────────────────────────

export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

// ─────────────────────────────────────────────────────────────
// SPACING SCALE VALUES
// ─────────────────────────────────────────────────────────────

/** Numeric values for each spacing token */
export const SPACING_VALUES: Record<SpacingToken, number> = {
  none: 0,
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  "2xl": 6,
};

// ─────────────────────────────────────────────────────────────
// SEMANTIC SPACING CONSTANTS
// ─────────────────────────────────────────────────────────────

/**
 * Use these semantic constants for consistent spacing
 * instead of using tokens directly.
 */
export const SPACING = {
  // Gap between inline elements
  inline: "xs" as const,
  // Gap between list items
  list: "none" as const,
  // Gap between cards/tiles
  cards: "sm" as const,
  // Gap between major sections
  section: "md" as const,
  // Gap between page areas
  page: "lg" as const,
};

/**
 * Padding values for different container types
 */
export const PADDING = {
  // Compact elements (badges, tags)
  compact: "xs" as const,
  // Standard components (buttons, inputs)
  component: "sm" as const,
  // Cards and panels
  card: "md" as const,
  // Content areas
  content: "md" as const,
  // Modals and overlays
  modal: "lg" as const,
  // Page-level padding
  page: "md" as const,
};

// ─────────────────────────────────────────────────────────────
// LAYOUT DIMENSIONS
// ─────────────────────────────────────────────────────────────

/**
 * Standard layout dimensions used throughout the app.
 * All dimensions are in character cells.
 */
export const LAYOUT = {
  // Sidebar
  sidebar: {
    minWidth: 22,
    maxWidth: 26,
    collapsedWidth: 3,
  },
  // Content area
  content: {
    minWidth: 60,
  },
  // Modal/Overlay
  modal: {
    width: 72,
    compactWidth: 68,
  },
  // Progress bars
  progress: {
    width: 32,
    compactWidth: 24,
  },
  // Status bar
  statusBar: {
    height: 1,
  },
  // Header
  header: {
    height: 1,
  },
};

// ─────────────────────────────────────────────────────────────
// GAP HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Gap configuration for different layout patterns
 */
export const GAP = {
  // No gap (stacked elements)
  none: "none" as const,
  // Tight gap (compact lists)
  tight: "xs" as const,
  // Standard gap (most layouts)
  standard: "sm" as const,
  // Relaxed gap (cards, sections)
  relaxed: "md" as const,
  // Large gap (major sections)
  large: "lg" as const,
};

// ─────────────────────────────────────────────────────────────
// MARGIN HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Margin configuration for different use cases
 */
export const MARGIN = {
  // No margin
  none: "none" as const,
  // Bottom margin for list items
  listItem: "xs" as const,
  // Bottom margin for cards
  card: "sm" as const,
  // Section margin
  section: "md" as const,
};

// ─────────────────────────────────────────────────────────────
// BORDER STYLE CONSTANTS
// ─────────────────────────────────────────────────────────────

/**
 * Standard border styles for consistent visual hierarchy
 */
export const BORDER = {
  // No border
  none: "none" as const,
  // Single line - subtle containers
  single: "single" as const,
  // Rounded corners - cards, panels
  rounded: "rounded" as const,
  // Double line - modals, important containers
  double: "double" as const,
  // Heavy line - selected/active items
  heavy: "heavy" as const,
  // Dashed line - placeholders, disabled
  dashed: "dashed" as const,
};

// ─────────────────────────────────────────────────────────────
// SHADOW CONFIGURATION
// ─────────────────────────────────────────────────────────────

/**
 * Shadow configurations for depth hierarchy
 */
export const SHADOW = {
  // No shadow
  none: false as const,
  // Light shadow - subtle elevation
  light: { density: "light" as const },
  // Medium shadow - cards, modals
  medium: { offsetX: 1, offsetY: 1, density: "medium" as const },
  // Heavy shadow - overlays, important elements
  heavy: { offsetX: 2, offsetY: 1, density: "dense" as const },
};

// ─────────────────────────────────────────────────────────────
// STYLE PRESETS
// ─────────────────────────────────────────────────────────────

/**
 * Common style combinations for reuse
 */
export const PRESETS = {
  // Card container
  card: {
    border: BORDER.rounded,
    p: PADDING.card,
    shadow: SHADOW.light,
  },
  // Selected card
  selectedCard: {
    border: BORDER.heavy,
    p: PADDING.card,
    shadow: SHADOW.medium,
  },
  // Modal overlay
  modal: {
    border: BORDER.double,
    p: PADDING.modal,
    shadow: SHADOW.heavy,
  },
  // List item
  listItem: {
    mb: MARGIN.listItem,
  },
  // Section container
  section: {
    gap: GAP.standard,
    mb: MARGIN.section,
  },
  // Content box
  content: {
    border: BORDER.rounded,
    p: PADDING.content,
    flex: 1,
  },
};

// ─────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Props that accept spacing values
 */
export interface SpacingProps {
  /** Padding on all sides */
  p?: SpacingToken;
  /** Padding horizontal (left + right) */
  px?: SpacingToken;
  /** Padding vertical (top + bottom) */
  py?: SpacingToken;
  /** Padding top */
  pt?: SpacingToken;
  /** Padding right */
  pr?: SpacingToken;
  /** Padding bottom */
  pb?: SpacingToken;
  /** Padding left */
  pl?: SpacingToken;
  /** Margin on all sides */
  m?: SpacingToken;
  /** Margin horizontal */
  mx?: SpacingToken;
  /** Margin vertical */
  my?: SpacingToken;
  /** Margin top */
  mt?: SpacingToken;
  /** Margin right */
  mr?: SpacingToken;
  /** Margin bottom */
  mb?: SpacingToken;
  /** Margin left */
  ml?: SpacingToken;
  /** Gap between children */
  gap?: SpacingToken;
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Convert a spacing token to its numeric value
 */
export function spacingValue(token: SpacingToken): number {
  return SPACING_VALUES[token];
}

/**
 * Create consistent padding props
 */
export function pad(
  all?: SpacingToken,
  horizontal?: SpacingToken,
  vertical?: SpacingToken,
): Partial<SpacingProps> {
  if (all) return { p: all };
  return {
    ...(horizontal ? { px: horizontal } : {}),
    ...(vertical ? { py: vertical } : {}),
  };
}

/**
 * Create consistent margin props
 */
export function margin(
  all?: SpacingToken,
  horizontal?: SpacingToken,
  vertical?: SpacingToken,
): Partial<SpacingProps> {
  if (all) return { m: all };
  return {
    ...(horizontal ? { mx: horizontal } : {}),
    ...(vertical ? { my: vertical } : {}),
  };
}
