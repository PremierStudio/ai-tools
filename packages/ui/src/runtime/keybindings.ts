import { getEffectiveKey } from "../preferences.js";
import type { TuiState } from "../tui.js";

type KeyHandler = (ctx: {
  state: TuiState;
  update: (fn: (s: TuiState) => TuiState) => void;
}) => void;

type BindKeyWithMods = (semanticKey: string, ctrl?: boolean, shift?: boolean) => KeyHandler;

type BindingSpec = {
  actionId: string;
  defaults: string[];
  semanticKey: string;
  ctrl?: boolean;
  allowCustom?: (trigger: string) => boolean;
};

const actionKey = (actionId: string): string => `action:${actionId}`;

const OVERRIDABLE_BINDINGS: BindingSpec[] = [
  { actionId: "quit", defaults: ["q"], semanticKey: actionKey("quit") },
  {
    actionId: "quit-ctrl",
    defaults: ["ctrl+c"],
    semanticKey: actionKey("quit-ctrl"),
    ctrl: true,
    allowCustom: (trigger) => trigger === "ctrl+c",
  },
  { actionId: "tab-next", defaults: ["Tab"], semanticKey: actionKey("tab-next") },
  {
    actionId: "tab-prev",
    defaults: ["shift+Tab"],
    semanticKey: actionKey("tab-prev"),
    allowCustom: (trigger) => trigger === "shift+Tab",
  },
  { actionId: "view-1", defaults: ["1"], semanticKey: actionKey("view-1") },
  { actionId: "view-2", defaults: ["2"], semanticKey: actionKey("view-2") },
  { actionId: "view-3", defaults: ["3"], semanticKey: actionKey("view-3") },
  { actionId: "view-4", defaults: ["4"], semanticKey: actionKey("view-4") },
  { actionId: "help", defaults: ["?"], semanticKey: actionKey("help") },
  { actionId: "theme-cycle", defaults: ["t"], semanticKey: actionKey("theme-cycle") },
  { actionId: "sidebar-collapse", defaults: ["["], semanticKey: actionKey("sidebar-collapse") },
  { actionId: "sidebar-expand", defaults: ["]"], semanticKey: actionKey("sidebar-expand") },
  { actionId: "sessions-search", defaults: ["/"], semanticKey: actionKey("sessions-search") },
  { actionId: "sessions-sort", defaults: ["s"], semanticKey: actionKey("sessions-sort") },
  { actionId: "sessions-handoff", defaults: ["H"], semanticKey: actionKey("sessions-handoff") },
  { actionId: "detail-handoff", defaults: ["h"], semanticKey: actionKey("detail-handoff") },
  { actionId: "tools-kill", defaults: ["d"], semanticKey: actionKey("tools-kill") },
  { actionId: "config-generate", defaults: ["g"], semanticKey: actionKey("config-generate") },
  { actionId: "config-install", defaults: ["i"], semanticKey: actionKey("config-install") },
  { actionId: "config-refresh", defaults: ["r"], semanticKey: actionKey("config-refresh") },
  { actionId: "config-editor", defaults: ["e"], semanticKey: actionKey("config-editor") },
  { actionId: "config-sync", defaults: ["s"], semanticKey: actionKey("config-sync") },
  { actionId: "config-detect", defaults: ["d"], semanticKey: actionKey("config-detect") },
  { actionId: "terminal", defaults: ["`"], semanticKey: actionKey("terminal") },
];

const NON_OVERRIDABLE_BASE_KEYS: Array<{ trigger: string; semanticKey: string }> = [
  { trigger: "j", semanticKey: "j" },
  { trigger: "k", semanticKey: "k" },
  { trigger: "Down", semanticKey: "Down" },
  { trigger: "Up", semanticKey: "Up" },
  { trigger: "Enter", semanticKey: "Enter" },
  { trigger: "shift+Enter", semanticKey: "Enter" },
  { trigger: "Escape", semanticKey: "Escape" },
  { trigger: "Backspace", semanticKey: "Backspace" },
  { trigger: "Left", semanticKey: "Left" },
  { trigger: "Right", semanticKey: "Right" },
];

function resolveBinding(
  actionId: string,
  defaults: string[],
  overrides: Record<string, string>,
): string[] {
  const effective = getEffectiveKey(actionId, overrides).trim();
  if (!effective || effective.includes("/")) return defaults;
  return [effective];
}

export function buildDashboardKeyHandlers(
  bindKey: BindKeyWithMods,
  keyOverrides: Record<string, string>,
): Record<string, KeyHandler> {
  const handlers: Record<string, KeyHandler> = {};

  for (const binding of NON_OVERRIDABLE_BASE_KEYS) {
    const isShift = binding.trigger.startsWith("shift+");
    handlers[binding.trigger] = bindKey(binding.semanticKey, false, isShift);
  }

  for (const spec of OVERRIDABLE_BINDINGS) {
    const rawTriggers = resolveBinding(spec.actionId, spec.defaults, keyOverrides);
    const triggers = spec.allowCustom
      ? rawTriggers.filter((trigger) => spec.allowCustom?.(trigger) ?? true)
      : rawTriggers;
    const finalTriggers = triggers.length > 0 ? triggers : spec.defaults;
    for (const trigger of finalTriggers) {
      if (!trigger) continue;
      handlers[trigger] = bindKey(spec.semanticKey, spec.ctrl);
    }
  }

  return handlers;
}
