import { describe, it, expect, vi, afterEach } from "vitest";
import { slugify, sessionSlug } from "./slug.js";

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("removes special characters", () => {
    expect(slugify("hello@world!")).toBe("helloworld");
  });

  it("replaces underscores with hyphens", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles path-like strings", () => {
    expect(slugify("my-project")).toBe("my-project");
  });
});

describe("sessionSlug", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes tool name", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const slug = sessionSlug("claude");
    expect(slug).toMatch(/^claude-/);
  });

  it("includes slugified project path", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const slug = sessionSlug("claude", "/home/user/my-project");
    expect(slug).toContain("my-project");
    expect(slug).toMatch(/^claude-my-project-/);
  });

  it("includes timestamp component", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const slug = sessionSlug("codex");
    expect(slug).toBe(`codex-${(1000).toString(36)}`);
  });

  it("handles project paths with special characters", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const slug = sessionSlug("gemini", "/home/user/My Project!");
    expect(slug).toContain("my-project");
  });
});
