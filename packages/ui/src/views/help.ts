import type { UiKit } from "../types.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  OVERLAY_WIDTH,
  dimColor,
  getIconChar,
  GAP,
  PADDING,
} from "../theme.js";

/** Key chip + description rendered as a styled hint row. */
function hint<T>(ui: Pick<UiKit<T>, "text" | "row" | "richText">, key: string, desc: string): T {
  const chipBg = dimColor(BRAND.base, 0.3);
  return ui.row({ gap: GAP.standard }, [
    ui.richText([{ text: ` ${key} `, style: { fg: BRAND.accent, bold: true, bg: chipBg } }]),
    ui.text(desc, { style: { fg: STATUS.neutral } }),
  ]);
}

/** Section header — bold brand-colored label. */
function sectionHeader<T>(ui: Pick<UiKit<T>, "text">, label: string): T {
  return ui.text(label, { bold: true, style: { fg: BRAND.base } });
}

/**
 * Render the help overlay as a centered modal with dimmed backdrop.
 *
 * Two implicit columns of hint rows organized by context section.
 */
export function renderHelpOverlay<T>(
  ui: Pick<UiKit<T>, "text" | "box" | "column" | "row" | "divider" | "richText" | "modal">,
): T {
  // Rezi's ui.modal() takes content as a prop (not children).
  // closeOnEscape: false so our key handler manages dismiss (via ? key).
  return ui.modal({
    id: "help",
    backdrop: "dim",
    width: OVERLAY_WIDTH,
    title: `  ${getIconChar("nav.help")} Help / Keybindings  [? to close]  `,
    closeOnEscape: false,
    closeOnBackdrop: false,
    style: { bg: SURFACE.base },
    content: ui.column({ gap: GAP.none, p: PADDING.component }, [
      sectionHeader(ui, "Global"),
      hint(ui, "q / Ctrl+C", "Quit"),
      hint(ui, "Tab / BackTab", "Cycle view"),
      hint(ui, "1 \u2013 4", "Jump to view"),
      hint(ui, "Left / Right", "Focus sidebar / content"),
      hint(ui, "?", "Toggle this help"),
      hint(ui, "t", "Cycle theme"),
      hint(ui, "[ / ]", "Collapse / expand sidebar"),
      hint(ui, "Esc", "Settings menu"),
      hint(ui, "Backspace", "Navigate back"),
      ui.text(""),
      ui.divider({ char: "─" }),
      sectionHeader(ui, "Tools"),
      hint(ui, "j / k / \u2191\u2193", "Select tool"),
      hint(ui, "Enter", "Launch tool fullscreen"),
      hint(ui, "d", "Kill running tool"),
      ui.text(""),
      ui.divider({ char: "─" }),
      sectionHeader(ui, "Sessions"),
      hint(ui, "j / k / \u2191\u2193", "Select session"),
      hint(ui, "Enter", "View session detail"),
      hint(ui, "/", "Search"),
      hint(ui, "H", "Quick handoff"),
      hint(ui, "s", "Cycle sort column"),
      hint(ui, "Esc", "Clear search"),
      ui.text(""),
      ui.divider({ char: "─" }),
      sectionHeader(ui, "Session Detail"),
      hint(ui, "h", "Start handoff from session"),
      hint(ui, "Enter", "Launch tool to continue"),
      hint(ui, "Backspace", "Back to sessions list"),
      ui.text(""),
      ui.divider({ char: "─" }),
      sectionHeader(ui, "Handoff"),
      hint(ui, "j / k", "Select session / target"),
      hint(ui, "Enter", "Next step"),
      hint(ui, "Esc", "Cancel / back"),
      ui.text(""),
      ui.divider({ char: "─" }),
      sectionHeader(ui, "Config"),
      hint(ui, "g", "Generate config"),
      hint(ui, "i", "Install config"),
      hint(ui, "r", "Refresh status"),
      hint(ui, "e", "Open in $EDITOR"),
      ui.text(""),
      ui.richText([
        {
          text: " Tip ",
          style: { fg: BRAND.accent, bold: true, bg: dimColor(BRAND.base, 0.2) },
        },
        { text: "  Press ", style: { fg: TEXT.tertiary } },
        { text: "?", style: { fg: BRAND.accent, bold: true } },
        { text: " anywhere to toggle this overlay.", style: { fg: TEXT.tertiary } },
      ]),
    ]),
  });
}
