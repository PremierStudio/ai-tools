import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  findConfigFile,
  loadConfig,
  ConfigNotFoundError,
  ConfigValidationError,
} from "./loader.js";

// Mock node:fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import { existsSync } from "node:fs";

const mockedExistsSync = vi.mocked(existsSync);

describe("findConfigFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first matching config file", () => {
    mockedExistsSync.mockImplementation((path) => {
      return String(path).endsWith("ai-hooks.config.ts");
    });

    const result = findConfigFile("/project");
    expect(result).toContain("ai-hooks.config.ts");
  });

  it("returns .js file when .ts is missing", () => {
    mockedExistsSync.mockImplementation((path) => {
      return String(path).endsWith("ai-hooks.config.js");
    });

    const result = findConfigFile("/project");
    expect(result).toContain("ai-hooks.config.js");
  });

  it("returns .mjs file when .ts and .js are missing", () => {
    mockedExistsSync.mockImplementation((path) => {
      return String(path).endsWith("ai-hooks.config.mjs");
    });

    const result = findConfigFile("/project");
    expect(result).toContain("ai-hooks.config.mjs");
  });

  it("returns .mts file when all others are missing", () => {
    mockedExistsSync.mockImplementation((path) => {
      return String(path).endsWith("ai-hooks.config.mts");
    });

    const result = findConfigFile("/project");
    expect(result).toContain("ai-hooks.config.mts");
  });

  it("returns null when no config files exist", () => {
    mockedExistsSync.mockReturnValue(false);

    const result = findConfigFile("/project");
    expect(result).toBeNull();
  });

  it("uses process.cwd() as default when no cwd provided", () => {
    mockedExistsSync.mockReturnValue(false);

    const result = findConfigFile();
    expect(result).toBeNull();
    // Verify it was called (with process.cwd()-based paths)
    expect(mockedExistsSync).toHaveBeenCalled();
  });

  it("prefers .ts over .js when both exist", () => {
    mockedExistsSync.mockImplementation((path) => {
      const p = String(path);
      return p.endsWith("ai-hooks.config.ts") || p.endsWith("ai-hooks.config.js");
    });

    const result = findConfigFile("/project");
    expect(result).toContain("ai-hooks.config.ts");
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws ConfigNotFoundError when no config file is found", async () => {
    mockedExistsSync.mockReturnValue(false);

    await expect(loadConfig()).rejects.toThrow(ConfigNotFoundError);
  });

  it("throws ConfigNotFoundError when explicit path does not exist", async () => {
    mockedExistsSync.mockReturnValue(false);

    await expect(loadConfig("/project/missing-config.ts")).rejects.toThrow(ConfigNotFoundError);
  });

  it("throws ConfigNotFoundError with search path in message", async () => {
    mockedExistsSync.mockReturnValue(false);

    await expect(loadConfig(undefined, "/my/project")).rejects.toThrow(/No ai-hooks config found/);
    await expect(loadConfig(undefined, "/my/project")).rejects.toThrow(/\/my\/project/);
  });

  it("throws ConfigNotFoundError when findConfigFile returns null and no explicit path", async () => {
    mockedExistsSync.mockReturnValue(false);

    await expect(loadConfig(undefined, "/search/dir")).rejects.toThrow(ConfigNotFoundError);
  });

  it("throws ConfigValidationError when config has no hooks array", async () => {
    mockedExistsSync.mockReturnValue(true);

    // Create a temporary test config module that exports invalid config
    const invalidModulePath = "/tmp/ai-hooks-test-invalid-config.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(invalidModulePath, "export default { settings: {} };", "utf-8");

    try {
      await expect(loadConfig(invalidModulePath)).rejects.toThrow(ConfigValidationError);
      await expect(loadConfig(invalidModulePath)).rejects.toThrow(/hooks.*array/);
    } finally {
      await removeFile(invalidModulePath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("throws ConfigValidationError when hooks is not an array", async () => {
    mockedExistsSync.mockReturnValue(true);

    const badModulePath = "/tmp/ai-hooks-test-hooks-string.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(badModulePath, 'export default { hooks: "not-an-array" };', "utf-8");

    try {
      await expect(loadConfig(badModulePath)).rejects.toThrow(ConfigValidationError);
    } finally {
      await removeFile(badModulePath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("loads a valid config and returns it", async () => {
    mockedExistsSync.mockReturnValue(true);

    const validModulePath = "/tmp/ai-hooks-test-valid-config.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      validModulePath,
      `export default {
        hooks: [
          { id: "h1", name: "Hook 1", events: ["shell:before"], phase: "before", handler: async () => {} }
        ],
        settings: { hookTimeout: 3000 }
      };`,
      "utf-8",
    );

    try {
      const config = await loadConfig(validModulePath);
      expect(config.hooks).toHaveLength(1);
      expect(config.hooks[0]?.id).toBe("h1");
      expect(config.settings?.hookTimeout).toBe(3000);
    } finally {
      await removeFile(validModulePath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("supports named export (mod without default)", async () => {
    mockedExistsSync.mockReturnValue(true);

    const namedModulePath = "/tmp/ai-hooks-test-named-export.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      namedModulePath,
      `
      export const hooks = [
        { id: "named", name: "Named", events: ["file:write"], phase: "before", handler: async () => {} }
      ];
      `,
      "utf-8",
    );

    try {
      const config = await loadConfig(namedModulePath);
      expect(config.hooks).toBeDefined();
      expect(Array.isArray(config.hooks)).toBe(true);
    } finally {
      await removeFile(namedModulePath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("merges extends presets before local hooks", async () => {
    mockedExistsSync.mockReturnValue(true);

    const extendModulePath = "/tmp/ai-hooks-test-extends.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      extendModulePath,
      `
      const presetHook = { id: "preset-h", name: "Preset", events: ["shell:before"], phase: "before", handler: async () => {} };
      const localHook = { id: "local-h", name: "Local", events: ["file:write"], phase: "before", handler: async () => {} };
      export default {
        hooks: [localHook],
        extends: [{ hooks: [presetHook] }],
      };
      `,
      "utf-8",
    );

    try {
      const config = await loadConfig(extendModulePath);
      expect(config.hooks).toHaveLength(2);
      // Presets come first, then local
      expect(config.hooks[0]?.id).toBe("preset-h");
      expect(config.hooks[1]?.id).toBe("local-h");
      // extends should be cleared
      expect(config.extends).toBeUndefined();
    } finally {
      await removeFile(extendModulePath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("merges multiple extends presets in order", async () => {
    mockedExistsSync.mockReturnValue(true);

    const multiExtendPath = "/tmp/ai-hooks-test-multi-extends.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      multiExtendPath,
      `
      const p1 = { id: "p1", name: "P1", events: ["shell:before"], phase: "before", handler: async () => {} };
      const p2 = { id: "p2", name: "P2", events: ["file:write"], phase: "before", handler: async () => {} };
      const local = { id: "local", name: "Local", events: ["shell:after"], phase: "after", handler: async () => {} };
      export default {
        hooks: [local],
        extends: [{ hooks: [p1] }, { hooks: [p2] }],
      };
      `,
      "utf-8",
    );

    try {
      const config = await loadConfig(multiExtendPath);
      expect(config.hooks).toHaveLength(3);
      expect(config.hooks[0]?.id).toBe("p1");
      expect(config.hooks[1]?.id).toBe("p2");
      expect(config.hooks[2]?.id).toBe("local");
    } finally {
      await removeFile(multiExtendPath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("returns config unchanged when extends is empty array", async () => {
    mockedExistsSync.mockReturnValue(true);

    const emptyExtendsPath = "/tmp/ai-hooks-test-empty-extends.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      emptyExtendsPath,
      `
      const h = { id: "solo", name: "Solo", events: ["shell:before"], phase: "before", handler: async () => {} };
      export default {
        hooks: [h],
        extends: [],
      };
      `,
      "utf-8",
    );

    try {
      const config = await loadConfig(emptyExtendsPath);
      expect(config.hooks).toHaveLength(1);
      expect(config.hooks[0]?.id).toBe("solo");
    } finally {
      await removeFile(emptyExtendsPath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });

  it("returns config unchanged when extends is undefined", async () => {
    mockedExistsSync.mockReturnValue(true);

    const noExtendsPath = "/tmp/ai-hooks-test-no-extends.mjs";
    const { writeFile, rm: removeFile } = await import("node:fs/promises");
    await writeFile(
      noExtendsPath,
      `
      const h = { id: "plain", name: "Plain", events: ["shell:before"], phase: "before", handler: async () => {} };
      export default { hooks: [h] };
      `,
      "utf-8",
    );

    try {
      const config = await loadConfig(noExtendsPath);
      expect(config.hooks).toHaveLength(1);
      expect(config.hooks[0]?.id).toBe("plain");
    } finally {
      await removeFile(noExtendsPath, { force: true } as Parameters<typeof removeFile>[1]);
    }
  });
});

describe("ConfigNotFoundError", () => {
  it("has correct name and message", () => {
    const error = new ConfigNotFoundError("/project");
    expect(error.name).toBe("ConfigNotFoundError");
    expect(error.message).toContain("/project");
    expect(error.message).toContain("No ai-hooks config found");
    expect(error.message).toContain("ai-hooks init");
  });

  it("is an instance of Error", () => {
    const error = new ConfigNotFoundError("/test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConfigNotFoundError);
  });
});

describe("ConfigValidationError", () => {
  it("has correct name and message", () => {
    const error = new ConfigValidationError("hooks must be an array");
    expect(error.name).toBe("ConfigValidationError");
    expect(error.message).toBe("hooks must be an array");
  });

  it("is an instance of Error", () => {
    const error = new ConfigValidationError("invalid");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConfigValidationError);
  });
});
