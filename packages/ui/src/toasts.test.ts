import { describe, it, expect, beforeEach } from "vitest";
import { addToast, removeToast, expireToasts, resetToastIdCounter, type Toast } from "./toasts.js";

beforeEach(() => {
  resetToastIdCounter();
});

describe("addToast", () => {
  it("adds a toast to an empty array", () => {
    const result = addToast([], "success", "Config generated");
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("success");
    expect(result[0]!.message).toBe("Config generated");
    expect(result[0]!.id).toBe("toast-1");
  });

  it("appends to existing toasts", () => {
    const first = addToast([], "info", "Loading...");
    const second = addToast(first, "success", "Done");
    expect(second).toHaveLength(2);
    expect(second[1]!.id).toBe("toast-2");
  });

  it("sets timestamp to current time", () => {
    const now = Date.now();
    const result = addToast([], "error", "Failed");
    expect(result[0]!.timestamp).toBeGreaterThanOrEqual(now);
    expect(result[0]!.timestamp).toBeLessThanOrEqual(now + 100);
  });

  it("does not mutate input array", () => {
    const original: Toast[] = [];
    addToast(original, "info", "test");
    expect(original).toHaveLength(0);
  });

  it("increments IDs sequentially", () => {
    const a = addToast([], "info", "a");
    const b = addToast(a, "info", "b");
    const c = addToast(b, "info", "c");
    expect(c[0]!.id).toBe("toast-1");
    expect(c[1]!.id).toBe("toast-2");
    expect(c[2]!.id).toBe("toast-3");
  });

  it("supports all toast types", () => {
    const types: Array<"success" | "error" | "info"> = ["success", "error", "info"];
    for (const type of types) {
      const result = addToast([], type, "msg");
      expect(result[0]!.type).toBe(type);
    }
  });
});

describe("removeToast", () => {
  it("removes a toast by id", () => {
    const toasts = addToast(addToast([], "info", "a"), "info", "b");
    const result = removeToast(toasts, "toast-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("toast-2");
  });

  it("returns same array when id not found", () => {
    const toasts = addToast([], "info", "a");
    const result = removeToast(toasts, "nonexistent");
    expect(result).toHaveLength(1);
  });

  it("returns empty array when removing last toast", () => {
    const toasts = addToast([], "info", "a");
    const result = removeToast(toasts, "toast-1");
    expect(result).toHaveLength(0);
  });

  it("does not mutate input array", () => {
    const toasts = addToast([], "info", "a");
    const original = [...toasts];
    removeToast(toasts, "toast-1");
    expect(toasts).toEqual(original);
  });
});

describe("expireToasts", () => {
  it("removes toasts older than maxAge", () => {
    const old: Toast = { id: "old", type: "info", message: "old", timestamp: Date.now() - 5000 };
    const fresh: Toast = { id: "fresh", type: "info", message: "fresh", timestamp: Date.now() };
    const result = expireToasts([old, fresh], 3000);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("fresh");
  });

  it("keeps all toasts when none expired", () => {
    const toasts: Toast[] = [
      { id: "a", type: "info", message: "a", timestamp: Date.now() },
      { id: "b", type: "info", message: "b", timestamp: Date.now() },
    ];
    const result = expireToasts(toasts, 3000);
    expect(result).toHaveLength(2);
  });

  it("removes all toasts when all expired", () => {
    const toasts: Toast[] = [
      { id: "a", type: "info", message: "a", timestamp: Date.now() - 10000 },
      { id: "b", type: "info", message: "b", timestamp: Date.now() - 10000 },
    ];
    const result = expireToasts(toasts, 3000);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const result = expireToasts([], 3000);
    expect(result).toHaveLength(0);
  });

  it("does not mutate input array", () => {
    const old: Toast = { id: "old", type: "info", message: "old", timestamp: Date.now() - 5000 };
    const toasts = [old];
    expireToasts(toasts, 3000);
    expect(toasts).toHaveLength(1);
  });
});

describe("resetToastIdCounter", () => {
  it("resets ID counter to 1", () => {
    addToast([], "info", "a");
    addToast([], "info", "b");
    resetToastIdCounter();
    const result = addToast([], "info", "c");
    expect(result[0]!.id).toBe("toast-1");
  });
});
