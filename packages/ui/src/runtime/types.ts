import type { ThemeName } from "../theme/index.js";

export type SimpleKeyEvent = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
};

export type KeyAction =
  | { type: "launch-tool"; toolId: string; command: string; args: string[] }
  | { type: "launch-tool-embedded"; toolId: string; command: string; args: string[] }
  | { type: "kill-tool"; toolId: string }
  | { type: "quick-handoff"; sessionId: string }
  | { type: "start-handoff"; sessionId: string }
  | { type: "continue-session"; sessionId: string; toolId: string }
  | { type: "load-handoff-preview"; sessionId: string }
  | { type: "execute-handoff"; sessionId: string; targetTool: string }
  | { type: "generate-config" }
  | { type: "install-config" }
  | { type: "refresh-status" }
  | { type: "open-editor" }
  | { type: "cycle-theme"; newTheme: ThemeName; keyOverrides: Record<string, string> }
  | { type: "switch-to-terminal" }
  | {
      type: "apply-settings-theme";
      theme: ThemeName;
      closeAfter?: boolean;
      keyOverrides: Record<string, string>;
    }
  | {
      type: "set-key-override";
      actionId: string;
      key: string;
      currentTheme: ThemeName;
      updatedKeyOverrides: Record<string, string>;
    }
  | {
      type: "update-general-settings";
      showPaneBadge: boolean;
      fpsCap: number;
      sessionRefreshActiveMs: number;
      sessionRefreshIdleMs: number;
    };

export type KeyResult<State> = {
  state: State;
  stop: boolean;
  action: KeyAction | null;
};

export type ActionTelemetryEvent = {
  actionType: KeyAction["type"];
  phase: "start" | "success" | "error";
  durationMs: number;
  errorMessage?: string;
};
