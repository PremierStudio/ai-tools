import { describe, expect, it } from "vitest";
import { margin, pad, spacingValue } from "./spacing.js";

describe("spacingValue", () => {
  it("returns the numeric scale for each token", () => {
    expect(spacingValue("none")).toBe(0);
    expect(spacingValue("xs")).toBe(1);
    expect(spacingValue("md")).toBe(2);
    expect(spacingValue("2xl")).toBe(6);
  });
});

describe("pad", () => {
  it("uses all-sides padding when provided", () => {
    expect(pad("md")).toEqual({ p: "md" });
  });

  it("uses horizontal and vertical tokens independently", () => {
    expect(pad(undefined, "sm", "lg")).toEqual({ px: "sm", py: "lg" });
  });

  it("omits missing axis tokens", () => {
    expect(pad()).toEqual({});
    expect(pad(undefined, "xs")).toEqual({ px: "xs" });
    expect(pad(undefined, undefined, "xl")).toEqual({ py: "xl" });
  });
});

describe("margin", () => {
  it("uses all-sides margin when provided", () => {
    expect(margin("lg")).toEqual({ m: "lg" });
  });

  it("uses horizontal and vertical tokens independently", () => {
    expect(margin(undefined, "md", "sm")).toEqual({ mx: "md", my: "sm" });
  });

  it("omits missing axis tokens", () => {
    expect(margin()).toEqual({});
    expect(margin(undefined, "xl")).toEqual({ mx: "xl" });
    expect(margin(undefined, undefined, "none")).toEqual({ my: "none" });
  });
});
