/**
 * Key event routing for the terminal multiplexer.
 *
 * Converts Rezi ZrevEvent-like key events into terminal escape sequences
 * that can be written to a PTY's stdin.
 */

/**
 * Simplified key event from Rezi's ZrevEvent.
 */
export type TerminalKeyEvent = {
  kind: "text" | "key" | "paste";
  /** For "text" events: the character codepoint */
  codepoint?: number;
  /** For "key" events: the key code (matches Rezi's key codes) */
  keyCode?: number;
  /** Modifier flags */
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  /** For "paste" events: the pasted text */
  text?: string;
};

/**
 * Key code constants matching Rezi's ZrevEvent key codes.
 * These are based on standard terminal key codes.
 */
export const KEY_CODES = {
  UP: 0x41,
  DOWN: 0x42,
  RIGHT: 0x43,
  LEFT: 0x44,
  HOME: 0x48,
  END: 0x46,
  INSERT: 0x32,
  DELETE: 0x33,
  PAGE_UP: 0x35,
  PAGE_DOWN: 0x36,
  F1: 0x50,
  F2: 0x51,
  F3: 0x52,
  F4: 0x53,
  F5: 0x31_35,
  F6: 0x31_37,
  F7: 0x31_38,
  F8: 0x31_39,
  F9: 0x32_30,
  F10: 0x32_31,
  F11: 0x32_33,
  F12: 0x32_34,
  TAB: 0x09,
  ENTER: 0x0d,
  ESCAPE: 0x1b,
  BACKSPACE: 0x7f,
} as const;

/**
 * Map key codes to terminal escape sequences.
 */
const KEY_MAP: Record<number, string> = {
  [KEY_CODES.UP]: "\x1b[A",
  [KEY_CODES.DOWN]: "\x1b[B",
  [KEY_CODES.RIGHT]: "\x1b[C",
  [KEY_CODES.LEFT]: "\x1b[D",
  [KEY_CODES.HOME]: "\x1b[H",
  [KEY_CODES.END]: "\x1b[F",
  [KEY_CODES.INSERT]: "\x1b[2~",
  [KEY_CODES.DELETE]: "\x1b[3~",
  [KEY_CODES.PAGE_UP]: "\x1b[5~",
  [KEY_CODES.PAGE_DOWN]: "\x1b[6~",
  [KEY_CODES.F1]: "\x1bOP",
  [KEY_CODES.F2]: "\x1bOQ",
  [KEY_CODES.F3]: "\x1bOR",
  [KEY_CODES.F4]: "\x1bOS",
  [KEY_CODES.F5]: "\x1b[15~",
  [KEY_CODES.F6]: "\x1b[17~",
  [KEY_CODES.F7]: "\x1b[18~",
  [KEY_CODES.F8]: "\x1b[19~",
  [KEY_CODES.F9]: "\x1b[20~",
  [KEY_CODES.F10]: "\x1b[21~",
  [KEY_CODES.F11]: "\x1b[23~",
  [KEY_CODES.F12]: "\x1b[24~",
  [KEY_CODES.TAB]: "\t",
  [KEY_CODES.ENTER]: "\r",
  [KEY_CODES.ESCAPE]: "\x1b",
  [KEY_CODES.BACKSPACE]: "\x7f",
};

/**
 * Leader key: Ctrl+A (tmux convention).
 */
const LEADER_CODEPOINT = 1; // Ctrl+A = ASCII 0x01

/**
 * Check if a key event is the leader key (Ctrl+A).
 */
export function isLeaderKey(event: TerminalKeyEvent): boolean {
  if (event.kind === "text" && event.codepoint === LEADER_CODEPOINT) {
    return true;
  }
  if (event.kind === "key" && event.ctrl && event.keyCode === 0x61) {
    // 0x61 = 'a'
    return true;
  }
  return false;
}

/**
 * Convert a Rezi key event to terminal input bytes.
 * Returns null if the event should not be forwarded to the PTY.
 */
export function keyEventToTerminalInput(event: TerminalKeyEvent): string | null {
  // Paste events: send raw text
  if (event.kind === "paste" && event.text) {
    return event.text;
  }

  // Text events: convert codepoint to character
  if (event.kind === "text" && event.codepoint !== undefined) {
    // Ctrl key combinations generate control characters (codepoint 1-26)
    if (event.codepoint >= 1 && event.codepoint <= 26) {
      return String.fromCharCode(event.codepoint);
    }
    return String.fromCodePoint(event.codepoint);
  }

  // Key events: look up escape sequence
  if (event.kind === "key" && event.keyCode !== undefined) {
    // Ctrl + letter: send control character
    if (event.ctrl && event.keyCode >= 0x61 && event.keyCode <= 0x7a) {
      return String.fromCharCode(event.keyCode - 0x60);
    }

    // Shift+Tab → backtab
    if (event.shift && event.keyCode === KEY_CODES.TAB) {
      return "\x1b[Z";
    }

    // Modified arrow/nav keys (CSI 1;mod code) — must come before generic Alt handler
    // because arrow key codes overlap with printable ASCII range
    if (event.shift || event.ctrl || event.alt) {
      const mod = modifierCode(event);
      const arrowEsc = getModifiableEscape(event.keyCode, mod);
      if (arrowEsc) return arrowEsc;
    }

    // Alt + key: send ESC prefix + key (for printable chars without arrow/nav match)
    if (event.alt && event.keyCode >= 0x20 && event.keyCode <= 0x7e) {
      return `\x1b${String.fromCharCode(event.keyCode)}`;
    }

    // Plain key lookup
    const esc = KEY_MAP[event.keyCode];
    if (esc) return esc;
  }

  return null;
}

/**
 * Calculate modifier code for CSI sequences.
 * 1 = none, 2 = shift, 3 = alt, 4 = shift+alt, 5 = ctrl, etc.
 */
function modifierCode(event: TerminalKeyEvent): number {
  let code = 1;
  if (event.shift) code += 1;
  if (event.alt) code += 2;
  if (event.ctrl) code += 4;
  return code;
}

/**
 * Generate modified escape sequence for arrow/nav keys.
 */
function getModifiableEscape(keyCode: number, mod: number): string | null {
  // Arrow keys: \x1b[1;{mod}{letter}
  const arrowMap: Record<number, string> = {
    [KEY_CODES.UP]: "A",
    [KEY_CODES.DOWN]: "B",
    [KEY_CODES.RIGHT]: "C",
    [KEY_CODES.LEFT]: "D",
    [KEY_CODES.HOME]: "H",
    [KEY_CODES.END]: "F",
  };

  const letter = arrowMap[keyCode];
  if (letter) {
    return `\x1b[1;${mod}${letter}`;
  }

  // Page/Insert/Delete keys: \x1b[{code};{mod}~
  const tildeMap: Record<number, string> = {
    [KEY_CODES.INSERT]: "2",
    [KEY_CODES.DELETE]: "3",
    [KEY_CODES.PAGE_UP]: "5",
    [KEY_CODES.PAGE_DOWN]: "6",
  };

  const code = tildeMap[keyCode];
  if (code) {
    return `\x1b[${code};${mod}~`;
  }

  return null;
}

/**
 * Command bindings for command mode (after Ctrl+A leader).
 */
export type CommandAction =
  | { type: "switch-tab"; index: number }
  | { type: "new-pane" }
  | { type: "close-pane" }
  | { type: "next-tab" }
  | { type: "prev-tab" }
  | { type: "handoff" }
  | { type: "dashboard" }
  | { type: "send-leader" }
  | { type: "cancel" }
  | { type: "help" }
  | { type: "scrollback-up" }
  | { type: "scrollback-down" };

/**
 * Parse a key event in command mode into a command action.
 */
export function parseCommandKey(event: TerminalKeyEvent): CommandAction | null {
  // Ctrl+A again → send literal Ctrl+A to PTY
  if (isLeaderKey(event)) {
    return { type: "send-leader" };
  }

  if (event.kind === "text" && event.codepoint !== undefined) {
    const char = String.fromCodePoint(event.codepoint);

    // Number keys 1-9: switch to tab N
    if (char >= "1" && char <= "9") {
      return { type: "switch-tab", index: Number.parseInt(char, 10) - 1 };
    }

    switch (char) {
      case "c":
        return { type: "new-pane" };
      case "x":
        return { type: "close-pane" };
      case "n":
        return { type: "next-tab" };
      case "p":
        return { type: "prev-tab" };
      case "h":
        return { type: "handoff" };
      case "d":
        return { type: "dashboard" };
      case "?":
        return { type: "help" };
    }
  }

  if (event.kind === "key" && event.keyCode !== undefined) {
    if (event.keyCode === KEY_CODES.ESCAPE) {
      return { type: "cancel" };
    }

    // Shift+PageUp/Down for scrollback
    if (event.shift && event.keyCode === KEY_CODES.PAGE_UP) {
      return { type: "scrollback-up" };
    }
    if (event.shift && event.keyCode === KEY_CODES.PAGE_DOWN) {
      return { type: "scrollback-down" };
    }
  }

  return null;
}
