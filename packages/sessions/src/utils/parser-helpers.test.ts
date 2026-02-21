import { describe, it, expect } from "vitest";
import { parseJsonl, safeJsonParse, truncate } from "./parser-helpers.js";

describe("parseJsonl", () => {
  it("parses valid JSONL into an array", () => {
    const input = '{"a":1}\n{"a":2}\n{"a":3}';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it("skips empty lines", () => {
    const input = '{"a":1}\n\n{"a":2}\n\n';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("skips malformed lines", () => {
    const input = '{"a":1}\nnot json\n{"a":3}';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 3 }]);
  });

  it("returns empty array for empty string", () => {
    expect(parseJsonl("")).toEqual([]);
  });

  it("returns empty array for only whitespace", () => {
    expect(parseJsonl("  \n  \n  ")).toEqual([]);
  });

  it("handles single line", () => {
    const result = parseJsonl<{ x: string }>('{"x":"hello"}');
    expect(result).toEqual([{ x: "hello" }]);
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    const result = safeJsonParse('{"name":"test"}', {});
    expect(result).toEqual({ name: "test" });
  });

  it("returns fallback for invalid JSON", () => {
    const fallback = { default: true };
    const result = safeJsonParse("not json", fallback);
    expect(result).toBe(fallback);
  });

  it("returns fallback for empty string", () => {
    const result = safeJsonParse("", []);
    expect(result).toEqual([]);
  });

  it("parses arrays", () => {
    const result = safeJsonParse<number[]>("[1,2,3]", []);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("truncate", () => {
  it("returns string unchanged if under max length", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns string unchanged if exactly at max length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and adds ellipsis when over max length", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles very short max length", () => {
    expect(truncate("hello", 4)).toBe("h...");
  });

  it("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });
});
