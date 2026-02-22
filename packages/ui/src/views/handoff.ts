import type { UiKit } from "../types.js";
import type { SessionRow } from "../widgets/session-browser.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  COLOR_SEPARATOR,
  ACTION_SECONDARY_BG,
  dimColor,
  tintBg,
  getIconChar,
  getToolIcon,
  getToolColor,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";

export type HandoffViewState = {
  sessions: SessionRow[];
  handoffStep: number;
  handoffSessionId: string | null;
  handoffTargetTool: string | null;
  handoffPreview: string | null;
  selectedSessionIndex: number;
  selectedTargetIndex: number;
};

type HandoffTarget = { id: string; name: string };

type SessionColumnWidths = {
  tool: number;
  title: number;
  msgs: number;
  updated: number;
};

const HANDOFF_TARGETS: HandoffTarget[] = [
  { id: "claude", name: "Claude Code" },
  { id: "codex", name: "Codex" },
  { id: "gemini", name: "Gemini CLI" },
  { id: "opencode", name: "OpenCode" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function fitTextRight(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padStart(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

function computeSessionColumnWidths(): SessionColumnWidths {
  const terminalWidth = process.stdout.columns ?? 120;
  const estimatedContentWidth = Math.max(72, terminalWidth - 34);

  const tool = clamp(Math.floor(estimatedContentWidth * 0.2), 12, 22);
  const msgs = 8;
  const updated = 12;
  const separators = 6;
  const title = Math.max(24, estimatedContentWidth - tool - msgs - updated - separators);

  return { tool, title, msgs, updated };
}

/**
 * Render a rich step-progress indicator as a richText row.
 *
 *   ✓ Source  ──  ▶ Preview  ──  ○ Target  ──  ○ Confirm
 */
function renderStepProgress<T>(ui: Pick<UiKit<T>, "richText">, current: number): T {
  const steps = ["Source", "Preview", "Target", "Confirm"];
  const spans: Array<{ text: string; style?: Record<string, unknown> }> = [];

  steps.forEach((label, i) => {
    if (i > 0) {
      spans.push({ text: "  ──  ", style: { fg: COLOR_SEPARATOR } });
    }
    if (i < current) {
      spans.push({ text: `${getIconChar("status.success")} `, style: { fg: STATUS.success, bold: true } });
      spans.push({ text: label, style: { fg: TEXT.tertiary } });
    } else if (i === current) {
      spans.push({ text: `${getIconChar("status.running")} `, style: { fg: BRAND.accent, bold: true } });
      spans.push({ text: label, style: { fg: TEXT.primary, bold: true } });
    } else {
      spans.push({ text: `${getIconChar("status.pending")} `, style: { fg: COLOR_SEPARATOR } });
      spans.push({ text: label, style: { fg: COLOR_SEPARATOR } });
    }
  });

  return ui.richText(spans);
}

/**
 * Key hint chip row.
 */
function actionHints<T>(
  ui: Pick<UiKit<T>, "richText">,
  primary: string,
  primaryLabel: string,
  secondary: string,
  secondaryLabel: string,
): T {
  const chipBg = dimColor(BRAND.base, 0.25);
  return ui.richText([
    { text: ` ${primary} `, style: { fg: BRAND.accent, bold: true, bg: chipBg } },
    { text: `:${primaryLabel}  `, style: { fg: TEXT.tertiary } },
    {
      text: ` ${secondary} `,
      style: { fg: TEXT.tertiary, bold: true, bg: ACTION_SECONDARY_BG },
    },
    { text: `:${secondaryLabel}`, style: { fg: TEXT.tertiary } },
  ]);
}

/**
 * Render the handoff wizard view.
 */
export function renderHandoffView<T>(ui: UiKit<T>, state: HandoffViewState): T {
  const stepLabel = `Step ${state.handoffStep + 1} of 4`;
  const title = `Handoff Wizard  (${stepLabel})`;

  switch (state.handoffStep) {
    case 0:
      return renderSessionSelectStep(ui, state, title);
    case 1:
      return renderPreviewStep(ui, state, title);
    case 2:
      return renderTargetSelectStep(ui, state, title);
    case 3:
      return renderConfirmStep(ui, state, title);
    default:
      return renderSessionSelectStep(ui, state, title);
  }
}

function renderSessionSelectStep<T>(ui: UiKit<T>, state: HandoffViewState, title: string): T {
  if (state.sessions.length === 0) {
    return ui.box(
      { ...PRESETS.content, title, style: { bg: SURFACE.base } },
      [ui.text("No sessions available for handoff.", { style: { fg: STATUS.neutral }, dim: true })],
    );
  }

  const cols = computeSessionColumnWidths();
  const header = ui.richText([
    { text: "   " },
    { text: fitText("Tool", cols.tool), style: { fg: BRAND.base, bold: true } },
    { text: " │ ", style: { fg: TEXT.secondary } },
    { text: fitText("Title", cols.title), style: { fg: BRAND.base, bold: true } },
    { text: " │ ", style: { fg: TEXT.secondary } },
    { text: fitTextRight("Msgs", cols.msgs), style: { fg: BRAND.base, bold: true } },
    { text: " │ ", style: { fg: TEXT.secondary } },
    { text: fitTextRight("Updated", cols.updated), style: { fg: BRAND.base, bold: true } },
  ]);

  const rows = state.sessions.map((s, i) => {
    const selected = i === state.selectedSessionIndex;
    const prefix = selected ? "\u25B6" : " ";
    const icon = getIconChar(getToolIcon(s.tool));
    const brand = getToolColor(s.tool);
    const toolText = fitText(`${icon} ${s.tool}`, cols.tool);
    const titleText = fitText(s.title, cols.title);
    const msgsText = fitTextRight(String(s.messageCount), cols.msgs);
    const updatedText = fitTextRight(shortDate(s.updatedAt), cols.updated);
    const rowBg = i % 2 === 1 ? SURFACE.elevated : undefined;

    if (selected) {
      const selectedBg = tintBg(brand, 0.15);
      return ui.box({ style: { bg: selectedBg }, pl: 0 }, [
        ui.richText([
          { text: `${prefix} `, style: { fg: brand, bold: true, bg: selectedBg } },
          { text: toolText, style: { fg: brand, bold: true, bg: selectedBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selectedBg } },
          { text: titleText, style: { fg: TEXT.primary, bold: true, bg: selectedBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selectedBg } },
          { text: msgsText, style: { fg: BRAND.accent, bold: true, bg: selectedBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: selectedBg } },
          { text: updatedText, style: { fg: TEXT.tertiary, bg: selectedBg } },
        ]),
      ]);
    }

    if (rowBg) {
      return ui.box({ style: { bg: rowBg } }, [
        ui.richText([
          { text: `${prefix} `, style: { bg: rowBg } },
          { text: toolText, style: { fg: dimColor(brand, 0.6), bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: titleText, style: { fg: STATUS.neutral, bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: msgsText, style: { fg: TEXT.tertiary, bg: rowBg } },
          { text: " │ ", style: { fg: TEXT.secondary, bg: rowBg } },
          { text: updatedText, style: { fg: TEXT.tertiary, bg: rowBg } },
        ]),
      ]);
    }

    return ui.richText([
      { text: `${prefix} ` },
      { text: toolText, style: { fg: dimColor(brand, 0.6) } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: titleText, style: { fg: STATUS.neutral } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: msgsText, style: { fg: TEXT.tertiary } },
      { text: " │ ", style: { fg: TEXT.secondary } },
      { text: updatedText, style: { fg: TEXT.tertiary } },
    ]);
  });

  return ui.box(
    { border: PRESETS.card.border, title, p: PADDING.card, flex: 1, style: { bg: SURFACE.base } },
    [
      ui.column({ gap: GAP.none }, [
        renderStepProgress(ui, 0),
        ui.divider({ char: "─" }),
        ui.text("Select a session to hand off:", { bold: true, style: { fg: TEXT.primary } }),
        ui.text(""),
        header,
        ui.divider({ char: "─" }),
        ...rows,
        ui.text(""),
        actionHints(ui, "Enter", "Select", "Esc", "Cancel"),
      ]),
    ],
  );
}

function renderPreviewStep<T>(ui: UiKit<T>, state: HandoffViewState, title: string): T {
  const preview = state.handoffPreview ?? "Loading handoff preview...";
  const previewLines = preview.split("\n").slice(0, 16).join("\n");
  const previewBg = tintBg(BRAND.base, 0.08);

  return ui.box(
    { border: PRESETS.card.border, title, p: PADDING.card, flex: 1, style: { bg: SURFACE.base } },
    [
      ui.column({ gap: GAP.none }, [
        renderStepProgress(ui, 1),
        ui.divider({ char: "─" }),
        ui.text("Handoff Context Preview:", { bold: true, style: { fg: TEXT.primary } }),
        ui.text("Review what will be transferred before selecting a target.", {
          style: { fg: TEXT.tertiary },
        }),
        ui.text(""),
        ui.box({ style: { bg: previewBg }, p: PADDING.card }, [
          ui.text(previewLines, { style: { fg: STATUS.warning } }),
        ]),
        ui.text(""),
        actionHints(ui, "Enter", "Continue", "Esc", "Back"),
      ]),
    ],
  );
}

function renderTargetSelectStep<T>(ui: UiKit<T>, state: HandoffViewState, title: string): T {
  const rows = HANDOFF_TARGETS.map((target, i) => {
    const selected = i === state.selectedTargetIndex;
    const prefix = selected ? "\u25B6" : " ";
    const icon = getIconChar(getToolIcon(target.id));
    const color = getToolColor(target.id);
    const line = ui.richText([
      { text: `${prefix} `, style: { fg: selected ? color : TEXT.tertiary, bold: selected } },
      { text: `${icon} `, style: { fg: selected ? color : dimColor(color, 0.65), bold: selected } },
      { text: target.name, style: { fg: selected ? TEXT.primary : STATUS.neutral, bold: selected } },
    ]);
    if (!selected) return line;
    return ui.box({ style: { bg: tintBg(color, 0.15) }, pl: 0 }, [line]);
  });

  return ui.box(
    { border: PRESETS.card.border, title, p: PADDING.card, flex: 1, style: { bg: SURFACE.base } },
    [
      ui.column({ gap: GAP.none }, [
        renderStepProgress(ui, 2),
        ui.divider({ char: "─" }),
        ui.text("Select target tool:", { bold: true, style: { fg: TEXT.primary } }),
        ui.text("Pick where to continue this conversation.", { style: { fg: TEXT.tertiary } }),
        ui.text(""),
        ...rows,
        ui.text(""),
        actionHints(ui, "Enter", "Select", "Esc", "Back"),
      ]),
    ],
  );
}

function renderConfirmStep<T>(ui: UiKit<T>, state: HandoffViewState, title: string): T {
  const session = state.sessions.find((s) => s.id === state.handoffSessionId);
  const target = HANDOFF_TARGETS[state.selectedTargetIndex];
  const sessionTitle = session?.title ?? "Unknown";
  const targetName = target?.name ?? "Unknown";
  const targetId = target?.id ?? "";
  const targetColor = targetId ? getToolColor(targetId) : STATUS.success;
  const confirmBg = tintBg(BRAND.base, 0.08);

  return ui.box(
    { border: PRESETS.card.border, title, p: PADDING.card, flex: 1, style: { bg: confirmBg } },
    [
      ui.column({ gap: GAP.none }, [
        renderStepProgress(ui, 3),
        ui.divider({ char: "─" }),
        ui.text("Confirm Handoff:", { bold: true, style: { fg: TEXT.primary } }),
      ui.text(""),
      ui.richText([
        { text: "From", style: { fg: TEXT.tertiary } },
        { text: "  " },
        { text: sessionTitle, style: { fg: STATUS.warning, bold: true } },
      ]),
      ui.richText([
        { text: "To", style: { fg: TEXT.tertiary } },
        { text: "    " },
        { text: targetName, style: { fg: targetColor, bold: true } },
      ]),
      ui.text(""),
      actionHints(ui, "Enter", "Launch", "Esc", "Cancel"),
    ]),
  ]);
}

/**
 * Get the list of handoff target tool IDs.
 */
export function getHandoffTargets(): HandoffTarget[] {
  return [...HANDOFF_TARGETS];
}

/**
 * Get the target tool ID at the given index.
 */
export function getTargetToolId(index: number): string | null {
  const target = HANDOFF_TARGETS[index];
  return target?.id ?? null;
}

/**
 * Get context-sensitive key hints for the handoff view.
 */
export function getHandoffKeyHints(): string {
  return "Enter:Next  Esc:Cancel  j/k:Select";
}
