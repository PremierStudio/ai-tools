import { getEffectiveKey } from "../preferences.js";
import type { TuiState } from "../tui.js";

type KeyHandler = (ctx: {
  state: TuiState;
  update: (fn: (s: TuiState) => TuiState) => void;
}) => void;

type BindKey = (semanticKey: string, ctrl?: boolean) => KeyHandler;

type BindingSpec = {
  actionId: string;
  defaults: string[];
  semanticKey: string;
  ctrl?: boolean;
  allowCustom?: (trigger: string) => boolean;
};

const OVERRIDABLE_BINDINGS: BindingSpec[] = [
  { actionId: "quit", defaults: ["q"], semanticKey: "q" },
  {
    actionId: "quit-ctrl",
    defaults: ["ctrl+c"],
    semanticKey: "c",
    ctrl: true,
    allowCustom: (trigger) => trigger === "ctrl+c",
  },
  { actionId: "tab-next", defaults: ["Tab"], semanticKey: "Tab" },
  {
    actionId: "tab-prev",
    defaults: ["shift+Tab"],
    semanticKey: "BackTab",
    allowCustom: (trigger) => trigger === "shift+Tab",
  },
  { actionId: "view-1", defaults: ["1"], semanticKey: "1" },
  { actionId: "view-2", defaults: ["2"], semanticKey: "2" },
  { actionId: "view-3", defaults: ["3"], semanticKey: "3" },
  { actionId: "view-4", defaults: ["4"], semanticKey: "4" },
  { actionId: "help", defaults: ["?"], semanticKey: "?" },
  { actionId: "theme-cycle", defaults: ["t"], semanticKey: "t" },
  { actionId: "sidebar-collapse", defaults: ["["], semanticKey: "[" },
  { actionId: "sidebar-expand", defaults: ["]"], semanticKey: "]" },
  { actionId: "sessions-search", defaults: ["/"], semanticKey: "/" },
  { actionId: "sessions-sort", defaults: ["s"], semanticKey: "s" },
  { actionId: "sessions-handoff", defaults: ["H"], semanticKey: "H" },
  { actionId: "detail-handoff", defaults: ["h"], semanticKey: "h" },
  { actionId: "tools-kill", defaults: ["d"], semanticKey: "d" },
  { actionId: "config-generate", defaults: ["g"], semanticKey: "g" },
  { actionId: "config-install", defaults: ["i"], semanticKey: "i" },
  { actionId: "config-refresh", defaults: ["r"], semanticKey: "r" },
  { actionId: "config-editor", defaults: ["e"], semanticKey: "e" },
  { actionId: "terminal", defaults: ["`"], semanticKey: "`" },
];

const NON_OVERRIDABLE_BASE_KEYS: Array<{ trigger: string; semanticKey: string }> = [
  { trigger: "j", semanticKey: "j" },
  { trigger: "k", semanticKey: "k" },
  { trigger: "Down", semanticKey: "Down" },
  { trigger: "Up", semanticKey: "Up" },
  { trigger: "Enter", semanticKey: "Enter" },
  { trigger: "Escape", semanticKey: "Escape" },
  { trigger: "Backspace", semanticKey: "Backspace" },
  { trigger: "Left", semanticKey: "Left" },
  { trigger: "Right", semanticKey: "Right" },
];

function resolveBinding(actionId: string, defaults: string[], overrides: Record<string, string>): string[] {
  const effective = getEffectiveKey(actionId, overrides).trim();
  if (!effective || effective.includes("/")) return defaults;
  return [effective];
}

export function buildDashboardKeyHandlers(
  bindKey: BindKey,
  keyOverrides: Record<string, string>,
): Record<string, KeyHandler> {
  const handlers: Record<string, KeyHandler> = {};

  for (const binding of NON_OVERRIDABLE_BASE_KEYS) {
    handlers[binding.trigger] = bindKey(binding.semanticKey);
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
