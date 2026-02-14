import { describe, it, expect } from "vitest";
import { defineConfig, hook } from "./define.js";
import type { HookDefinition, AiHooksConfig } from "../types/index.js";

describe("defineConfig", () => {
  it("returns the config object unchanged", () => {
    const config: AiHooksConfig = {
      hooks: [],
      settings: { hookTimeout: 3000 },
    };
    const result = defineConfig(config);
    expect(result).toBe(config);
  });
});

describe("hook builder", () => {
  it("creates a before hook with required fields", () => {
    const def: HookDefinition = hook("before", ["shell:before"], async (_ctx, next) => {
      await next();
    })
      .id("test-hook")
      .name("Test Hook")
      .build();

    expect(def.id).toBe("test-hook");
    expect(def.name).toBe("Test Hook");
    expect(def.phase).toBe("before");
    expect(def.events).toEqual(["shell:before"]);
    expect(typeof def.handler).toBe("function");
  });

  it("creates an after hook", () => {
    const def = hook("after", ["shell:after"], async (_ctx, next) => {
      await next();
    })
      .id("after-hook")
      .name("After Hook")
      .build();

    expect(def.phase).toBe("after");
    expect(def.events).toEqual(["shell:after"]);
  });

  it("supports optional description", () => {
    const def = hook("before", ["file:write"], async (_ctx, next) => {
      await next();
    })
      .id("desc-hook")
      .name("Desc Hook")
      .description("Does something useful")
      .build();

    expect(def.description).toBe("Does something useful");
  });

  it("supports priority", () => {
    const def = hook("before", ["file:write"], async (_ctx, next) => {
      await next();
    })
      .id("priority-hook")
      .name("Priority Hook")
      .priority(5)
      .build();

    expect(def.priority).toBe(5);
  });

  it("supports filter function", () => {
    const def = hook("before", ["shell:before"], async (_ctx, next) => {
      await next();
    })
      .id("filter-hook")
      .name("Filter Hook")
      .filter((event) => event.command.includes("git"))
      .build();

    expect(typeof def.filter).toBe("function");
  });

  it("supports enabled flag", () => {
    const def = hook("before", ["shell:before"], async (_ctx, next) => {
      await next();
    })
      .id("disabled-hook")
      .name("Disabled Hook")
      .enabled(false)
      .build();

    expect(def.enabled).toBe(false);
  });

  it("supports multiple event types", () => {
    const def = hook("before", ["file:write", "file:edit", "file:delete"], async (_ctx, next) => {
      await next();
    })
      .id("multi-event")
      .name("Multi Event")
      .build();

    expect(def.events).toEqual(["file:write", "file:edit", "file:delete"]);
  });

  it("generates default id and name when not specified", () => {
    const def = hook("before", ["shell:before"], async (_ctx, next) => {
      await next();
    }).build();

    expect(def.id).toMatch(/^hook-/);
    expect(def.name).toContain("shell:before");
  });

  it("chains all builder methods fluently", () => {
    const def = hook("before", ["shell:before"], async (ctx, next) => {
      ctx.results.push({ blocked: true, reason: "test" });
      await next();
    })
      .id("chained")
      .name("Chained")
      .description("All methods chained")
      .priority(1)
      .filter(() => true)
      .enabled(true)
      .build();

    expect(def.id).toBe("chained");
    expect(def.name).toBe("Chained");
    expect(def.description).toBe("All methods chained");
    expect(def.priority).toBe(1);
    expect(def.filter).toBeDefined();
    expect(def.enabled).toBe(true);
  });

  it("provides type-safe event access in handler", () => {
    // This test verifies the generic constraint works at compile time.
    // The handler receives ShellBeforeEvent with `.command` property.
    const def = hook("before", ["shell:before"], async (ctx, next) => {
      const cmd: string = ctx.event.command;
      ctx.state.set("cmd", cmd);
      await next();
    })
      .id("typed")
      .name("Typed")
      .build();

    expect(def.id).toBe("typed");
  });
});
