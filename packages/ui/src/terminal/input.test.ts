import { describe, it, expect } from "vitest";
import {
  isLeaderKey,
  keyEventToTerminalInput,
  parseCommandKey,
  KEY_CODES,
  type TerminalKeyEvent,
} from "./input.js";

// ── Helpers ───────────────────────────────────────────

function textEvent(codepoint: number): TerminalKeyEvent {
  return { kind: "text", codepoint };
}

function keyEvent(
  keyCode: number,
  mods?: { shift?: boolean; ctrl?: boolean; alt?: boolean },
): TerminalKeyEvent {
  return { kind: "key", keyCode, ...mods };
}

function pasteEvent(text: string): TerminalKeyEvent {
  return { kind: "paste", text };
}

// ── isLeaderKey ───────────────────────────────────────

describe("isLeaderKey", () => {
  it("detects Ctrl+A as text event (codepoint 1)", () => {
    expect(isLeaderKey(textEvent(1))).toBe(true);
  });

  it("detects Ctrl+A as key event", () => {
    expect(isLeaderKey(keyEvent(0x61, { ctrl: true }))).toBe(true);
  });

  it("does not match regular 'a' key", () => {
    expect(isLeaderKey(textEvent(97))).toBe(false);
  });

  it("does not match Ctrl+B", () => {
    expect(isLeaderKey(textEvent(2))).toBe(false);
  });

  it("does not match paste events", () => {
    expect(isLeaderKey(pasteEvent("\x01"))).toBe(false);
  });
});

// ── keyEventToTerminalInput ───────────────────────────

describe("keyEventToTerminalInput", () => {
  // Text events
  it("converts printable character", () => {
    expect(keyEventToTerminalInput(textEvent(65))).toBe("A");
  });

  it("converts space", () => {
    expect(keyEventToTerminalInput(textEvent(32))).toBe(" ");
  });

  it("converts Ctrl+A (codepoint 1) to control character", () => {
    expect(keyEventToTerminalInput(textEvent(1))).toBe("\x01");
  });

  it("converts Ctrl+C (codepoint 3) to control character", () => {
    expect(keyEventToTerminalInput(textEvent(3))).toBe("\x03");
  });

  it("converts Ctrl+Z (codepoint 26) to control character", () => {
    expect(keyEventToTerminalInput(textEvent(26))).toBe("\x1a");
  });

  it("converts unicode codepoint", () => {
    expect(keyEventToTerminalInput(textEvent(0x1f600))).toBe("\u{1f600}");
  });

  // Paste events
  it("passes paste text through directly", () => {
    expect(keyEventToTerminalInput(pasteEvent("hello world"))).toBe("hello world");
  });

  it("returns null for empty paste", () => {
    expect(keyEventToTerminalInput({ kind: "paste" })).toBeNull();
  });

  // Key events - plain
  it("maps Up arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.UP))).toBe("\x1b[A");
  });

  it("maps Down arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.DOWN))).toBe("\x1b[B");
  });

  it("maps Right arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.RIGHT))).toBe("\x1b[C");
  });

  it("maps Left arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.LEFT))).toBe("\x1b[D");
  });

  it("maps Home", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.HOME))).toBe("\x1b[H");
  });

  it("maps End", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.END))).toBe("\x1b[F");
  });

  it("maps Delete", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.DELETE))).toBe("\x1b[3~");
  });

  it("maps Page Up", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.PAGE_UP))).toBe("\x1b[5~");
  });

  it("maps Page Down", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.PAGE_DOWN))).toBe("\x1b[6~");
  });

  it("maps Tab", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.TAB))).toBe("\t");
  });

  it("maps Enter", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.ENTER))).toBe("\r");
  });

  it("maps Escape", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.ESCAPE))).toBe("\x1b");
  });

  it("maps Backspace", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.BACKSPACE))).toBe("\x7f");
  });

  it("maps F1", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.F1))).toBe("\x1bOP");
  });

  it("maps F12", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.F12))).toBe("\x1b[24~");
  });

  // Key events - with modifiers
  it("maps Ctrl+letter to control character", () => {
    // Ctrl+C = 0x63 - 0x60 = 3
    expect(keyEventToTerminalInput(keyEvent(0x63, { ctrl: true }))).toBe("\x03");
  });

  it("maps Ctrl+A to control character", () => {
    expect(keyEventToTerminalInput(keyEvent(0x61, { ctrl: true }))).toBe("\x01");
  });

  it("maps Ctrl+Z", () => {
    expect(keyEventToTerminalInput(keyEvent(0x7a, { ctrl: true }))).toBe("\x1a");
  });

  it("maps Alt+letter to ESC prefix", () => {
    // Alt+x = ESC + x
    expect(keyEventToTerminalInput(keyEvent(0x78, { alt: true }))).toBe("\x1bx");
  });

  it("maps Shift+Tab to backtab", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.TAB, { shift: true }))).toBe("\x1b[Z");
  });

  it("maps Shift+Up to modified arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.UP, { shift: true }))).toBe("\x1b[1;2A");
  });

  it("maps Ctrl+Up to modified arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.UP, { ctrl: true }))).toBe("\x1b[1;5A");
  });

  it("maps Ctrl+Shift+Right to modified arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.RIGHT, { ctrl: true, shift: true }))).toBe(
      "\x1b[1;6C",
    );
  });

  it("maps Alt+Up to modified arrow", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.UP, { alt: true }))).toBe("\x1b[1;3A");
  });

  it("maps Ctrl+Delete to modified tilde", () => {
    expect(keyEventToTerminalInput(keyEvent(KEY_CODES.DELETE, { ctrl: true }))).toBe("\x1b[3;5~");
  });

  it("returns null for unknown key code", () => {
    expect(keyEventToTerminalInput(keyEvent(0xffff))).toBeNull();
  });
});

// ── parseCommandKey ───────────────────────────────────

describe("parseCommandKey", () => {
  it("maps number 1 to switch-tab 0", () => {
    expect(parseCommandKey(textEvent(49))).toEqual({ type: "switch-tab", index: 0 });
  });

  it("maps number 9 to switch-tab 8", () => {
    expect(parseCommandKey(textEvent(57))).toEqual({ type: "switch-tab", index: 8 });
  });

  it("maps 'c' to new-pane", () => {
    expect(parseCommandKey(textEvent(99))).toEqual({ type: "new-pane" });
  });

  it("maps 'x' to close-pane", () => {
    expect(parseCommandKey(textEvent(120))).toEqual({ type: "close-pane" });
  });

  it("maps 'n' to next-tab", () => {
    expect(parseCommandKey(textEvent(110))).toEqual({ type: "next-tab" });
  });

  it("maps 'p' to prev-tab", () => {
    expect(parseCommandKey(textEvent(112))).toEqual({ type: "prev-tab" });
  });

  it("maps 'h' to handoff", () => {
    expect(parseCommandKey(textEvent(104))).toEqual({ type: "handoff" });
  });

  it("maps 'd' to dashboard", () => {
    expect(parseCommandKey(textEvent(100))).toEqual({ type: "dashboard" });
  });

  it("maps '?' to help", () => {
    expect(parseCommandKey(textEvent(63))).toEqual({ type: "help" });
  });

  it("maps Escape to cancel", () => {
    expect(parseCommandKey(keyEvent(KEY_CODES.ESCAPE))).toEqual({ type: "cancel" });
  });

  it("maps Ctrl+A to send-leader", () => {
    expect(parseCommandKey(textEvent(1))).toEqual({ type: "send-leader" });
  });

  it("maps Shift+PageUp to scrollback-up", () => {
    expect(parseCommandKey(keyEvent(KEY_CODES.PAGE_UP, { shift: true }))).toEqual({
      type: "scrollback-up",
    });
  });

  it("maps Shift+PageDown to scrollback-down", () => {
    expect(parseCommandKey(keyEvent(KEY_CODES.PAGE_DOWN, { shift: true }))).toEqual({
      type: "scrollback-down",
    });
  });

  it("returns null for unknown key", () => {
    expect(parseCommandKey(textEvent(64))).toBeNull(); // '@'
  });
});
