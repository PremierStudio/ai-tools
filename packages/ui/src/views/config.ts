import type { UiKit } from "../types.js";
import type { EngineStatus } from "../widgets/config-dashboard.js";
import {
  BRAND,
  STATUS,
  SURFACE,
  TEXT,
  tintBg,
  getIconChar,
  PADDING,
  GAP,
  PRESETS,
} from "../theme.js";

export type ConfigViewState = {
  engines: EngineStatus[];
  mode: string;
  configHealth: string;
  loadingConfig: boolean;
};

function hColor(health: string): { r: number; g: number; b: number } {
  const h = health.toLowerCase();
  if (h === "healthy" || h === "ok") return STATUS.success;
  if (h === "stale" || h === "warning") return STATUS.warning;
  if (h === "error" || h === "unhealthy") return STATUS.error;
  return STATUS.neutral;
}

function hCalloutVariant(health: string): string {
  const h = health.toLowerCase();
  if (h === "healthy" || h === "ok") return "success";
  if (h === "stale" || h === "warning") return "warning";
  if (h === "error" || h === "unhealthy") return "error";
  return "info";
}

const TITLE = `  ${getIconChar("nav.config")} Config  [g:Generate  i:Install  r:Refresh]  `;

function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, width - 1)}…`;
}

/**
 * Render the config dashboard.
 */
export function renderConfigView<T>(ui: UiKit<T>, state: ConfigViewState): T {
  // ── Loading state ───────────────────────────
  if (state.loadingConfig) {
    return ui.box(
      { ...PRESETS.content, title: TITLE, style: { bg: SURFACE.base } },
      [ui.spinner({ variant: "dots", label: "Loading config…" })],
    );
  }

  // ── Empty state ───────────────────────────
  if (state.engines.length === 0) {
    return ui.box(
      { ...PRESETS.content, title: TITLE, style: { bg: SURFACE.base } },
      [ui.text("No engines found.", { style: { fg: TEXT.tertiary }, dim: true })],
    );
  }

  const configuredCount = state.engines.filter((e) => e.configured).length;
  const total = state.engines.length;
  const health = state.configHealth;
  const color = hColor(health);
  const calloutVariant = hCalloutVariant(health);

  // ── Health summary callout ──────────────────────────
  const healthCallout = ui.callout(
    `${health}  ·  ${state.mode} mode  ·  ${configuredCount}/${total} engines configured`,
    { variant: calloutVariant },
  );

  const contentWidth = Math.max(70, (process.stdout.columns ?? 120) - 36);
  const colEngine = Math.max(14, Math.floor(contentWidth * 0.25));
  const colStatus = Math.max(18, Math.floor(contentWidth * 0.2));
  const colDetail = Math.max(20, contentWidth - colEngine - colStatus - 6);

  const tableHeader = ui.richText([
    { text: "  " },
    { text: fitText("Engine", colEngine), style: { fg: BRAND.base, bold: true } },
    { text: " │ ", style: { fg: TEXT.tertiary } },
    { text: fitText("Status", colStatus), style: { fg: BRAND.base, bold: true } },
    { text: " │ ", style: { fg: TEXT.tertiary } },
    { text: fitText("Detail", colDetail), style: { fg: BRAND.base, bold: true } },
  ]);

  // ── Per-engine rows ───────────────────────────
  const engineRows: T[] = state.engines.map((e, index) => {
    const dotColor = e.configured ? STATUS.success : e.error ? STATUS.error : TEXT.tertiary;
    const statusText = e.configured ? "configured" : e.error ? "error" : "not configured";
    const detailText = e.error ? `error: ${e.error}` : e.configured ? "ready" : "not configured";
    const rowBg = index % 2 === 1 ? SURFACE.elevated : undefined;
    const baseLine = ui.richText([
      { text: "  ", style: rowBg ? { bg: rowBg } : undefined },
      {
        text: fitText(`${e.configured ? getIconChar("nav.sessions") : getIconChar("status.inactive")} ${e.engine}`, colEngine),
        style: {
          fg: e.configured ? BRAND.base : TEXT.secondary,
          bg: rowBg,
          bold: e.configured,
        },
      },
      { text: " │ ", style: { fg: TEXT.tertiary, bg: rowBg } },
      {
        text: fitText(statusText, colStatus),
        style: { fg: dotColor, bg: rowBg, bold: e.configured || Boolean(e.error) },
      },
      { text: " │ ", style: { fg: TEXT.tertiary, bg: rowBg } },
      {
        text: fitText(detailText, colDetail),
        style: { fg: TEXT.tertiary, bg: rowBg },
      },
    ]);

    if (rowBg) {
      return ui.box({ style: { bg: rowBg } }, [baseLine]);
    }
    return baseLine;
  });

  // ── Mode + session stats summary ────────────────────
  const summary = ui.richText([
    { text: "Mode  ", style: { fg: STATUS.neutral } },
    { text: state.mode, style: { fg: STATUS.info, bold: true } },
    { text: "  │  Health  ", style: { fg: STATUS.neutral } },
    { text: health, style: { fg: color, bold: true } },
    { text: "  │  Engines  ", style: { fg: STATUS.neutral } },
    {
      text: `${configuredCount}/${total}`,
      style: {
        fg: configuredCount === total ? STATUS.success : STATUS.warning,
        bold: true,
      },
    },
  ]);

  // ── Actions hint ────────────────────────────────────
  const actionsHint = ui.richText([
    { text: "g", style: { fg: BRAND.base, bold: true } },
    { text: ":Generate  ", style: { fg: TEXT.tertiary } },
    { text: "i", style: { fg: BRAND.base, bold: true } },
    { text: ":Install  ", style: { fg: TEXT.tertiary } },
    { text: "r", style: { fg: BRAND.base, bold: true } },
    { text: ":Refresh  ", style: { fg: TEXT.tertiary } },
    { text: "e", style: { fg: BRAND.base, bold: true } },
    { text: ":$EDITOR", style: { fg: TEXT.tertiary } },
  ]);

  return ui.box(
    { border: PRESETS.card.border, title: TITLE, p: PADDING.card, flex: 1, style: { bg: SURFACE.base } },
    [ui.column({ gap: GAP.standard }, [
      healthCallout,
      summary,
      ui.divider(),
      ui.richText([
        { text: "Engine Status", style: { fg: BRAND.base, bold: true } },
        {
          text: `  (${configuredCount} of ${total} configured)`,
          style: { fg: TEXT.tertiary },
        },
      ]),
      tableHeader,
      ui.divider({ char: "─" }),
      ui.column({ gap: GAP.none }, engineRows),
      ui.box({ style: { bg: tintBg(BRAND.base, 0.08) }, p: PADDING.card }, [
        ui.richText([
          { text: "Tip: ", style: { fg: TEXT.primary, bold: true } },
          {
            text: "Use g to generate, i to install, and r to re-check health quickly.",
            style: { fg: TEXT.tertiary },
          },
        ]),
      ]),
      ui.divider(),
      actionsHint,
    ]),
  ]);
}

export function getConfigKeyHints(): string {
  return "g:Generate  i:Install  r:Refresh  e:$EDITOR";
}
