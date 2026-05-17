import type { UiKit } from "../types.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  OVERLAY_WIDTH,
  dimColor,
  tintBg,
  getIconChar,
  GAP,
  PADDING,
  TINT,
} from "../theme.js";

/** Key chip + description rendered as a styled hint row. */
function hint<T>(ui: Pick<UiKit<T>, "text" | "row" | "richText">, key: string, desc: string): T {
  const chipBg = dimColor(BRAND.base, 0.3);
  return ui.row({ gap: GAP.standard }, [
    ui.richText([{ text: ` ${key} `, style: { fg: BRAND.accent, bold: true, bg: chipBg } }]),
    ui.text(desc, { style: { fg: STATUS.neutral } }),
  ]);
}

/** Section header — bold brand-colored label with icon. */
function sectionHeader<T>(ui: Pick<UiKit<T>, "richText">, icon: string, label: string): T {
  return ui.richText([
    { text: `${icon} `, style: { fg: BRAND.accent, bold: true } },
    { text: label, style: { fg: BRAND.base, bold: true } },
  ]);
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
    content: ui.column({ gap: GAP.tight, p: PADDING.component }, [
      sectionHeader(ui, getIconChar("brand.logo"), "Global"),
      hint(ui, "q / Ctrl+C", "Quit"),
      hint(ui, "Tab / BackTab", "Cycle view"),
      hint(ui, "1-4", "Jump to view"),
      hint(ui, "Left / Right", "Focus sidebar / content"),
      hint(ui, "?", "Toggle this help"),
      hint(ui, "t", "Cycle theme"),
      hint(ui, "[ / ]", "Collapse / expand sidebar"),
      hint(ui, "Esc", "Settings menu"),
      hint(ui, "Backspace", "Navigate back"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("nav.tools"), "Tools"),
      hint(ui, "j / k", "Select tool"),
      hint(ui, "Enter", "Launch tool fullscreen"),
      hint(ui, "Shift+Enter", "Launch in embedded pane"),
      hint(ui, "d", "Kill running tool"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("nav.sessions"), "Sessions"),
      hint(ui, "j / k", "Select session"),
      hint(ui, "Enter", "View session detail"),
      hint(ui, "/", "Search sessions"),
      hint(ui, "Shift+H", "Open handoff wizard"),
      hint(ui, "s", "Cycle sort column"),
      hint(ui, "Esc", "Clear search"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("session.folder"), "Session Detail"),
      hint(ui, "h", "Handoff current session"),
      hint(ui, "Enter", "Launch tool to continue"),
      hint(ui, "Backspace", "Back to sessions list"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("nav.handoff"), "Handoff Wizard"),
      hint(ui, "j / k", "Select session / target"),
      hint(ui, "Enter", "Next step"),
      hint(ui, "Esc", "Cancel / back"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("nav.config"), "Config"),
      hint(ui, "g", "Generate config"),
      hint(ui, "i", "Install config"),
      hint(ui, "s", "Sync config"),
      hint(ui, "d", "Detect engines"),
      hint(ui, "r", "Refresh status"),
      hint(ui, "e", "Open in $EDITOR"),
      ui.divider({ char: "─" }),
      sectionHeader(ui, getIconChar("nav.settings"), "Settings"),
      hint(ui, "1-3", "Switch tab"),
      hint(ui, "j / k", "Navigate options"),
      hint(ui, "Enter", "Select / toggle"),
      hint(ui, "Esc", "Close settings"),
      ui.divider({ char: "─" }),
      ui.box({ style: { bg: tintBg(BRAND.base, TINT.subtle) }, p: PADDING.card }, [
        ui.richText([
          {
            text: ` ${getIconChar("nav.help")} Tip `,
            style: { fg: BRAND.accent, bold: true, bg: dimColor(BRAND.base, 0.2) },
          },
          { text: "  Press ", style: { fg: TEXT.tertiary } },
          { text: "?", style: { fg: BRAND.accent, bold: true } },
          { text: " anywhere to toggle this overlay.", style: { fg: TEXT.tertiary } },
        ]),
      ]),
    ]),
  });
}
