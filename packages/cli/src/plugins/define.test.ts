import { describe, expect, it } from "vitest";

import { definePlugin } from "./define.js";

describe("definePlugin", () => {
  it("returns the same plugin object", () => {
    const plugin = definePlugin({
      id: "cert-coach",
      name: "Certification Coach",
      version: "0.1.0",
      mcpServers: [],
      skills: [],
    });

    expect(plugin.id).toBe("cert-coach");
    expect(plugin.name).toBe("Certification Coach");
  });
});
