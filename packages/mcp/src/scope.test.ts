import { describe, expect, it } from "vitest";
import { filterServers } from "./scope.js";
import type { MCPServerDefinition } from "./types/index.js";

const stdio = (id: string, extra: Partial<MCPServerDefinition> = {}): MCPServerDefinition => ({
  id,
  name: id,
  transport: { type: "stdio", command: "npx" },
  ...extra,
});

describe("filterServers", () => {
  it("defaults missing layer to project", () => {
    const servers = [stdio("github")];
    expect(
      filterServers(servers, { layer: "project", cwd: "/home/blitz/app" }).map((s) => s.id),
    ).toEqual(["github"]);
    expect(filterServers(servers, { layer: "user", cwd: "/home/blitz/app" })).toEqual([]);
  });

  it("keeps user-layer servers only for user installs", () => {
    const servers = [stdio("unifi", { layer: "user" }), stdio("repo-lint", { layer: "project" })];
    expect(filterServers(servers, { layer: "user", cwd: "/tmp" }).map((s) => s.id)).toEqual([
      "unifi",
    ]);
    expect(filterServers(servers, { layer: "project", cwd: "/tmp" }).map((s) => s.id)).toEqual([
      "repo-lint",
    ]);
  });

  it("restricts PalamHealth servers to matching project paths", () => {
    const servers = [
      stdio("palamhealth", { layer: "project", whenPathContains: ["PalamHealth"] }),
      stdio("outline", { layer: "project", whenPathContains: ["PalamHealth"] }),
      stdio("github", { layer: "project" }),
    ];
    const inPh = filterServers(servers, {
      layer: "project",
      cwd: "/home/blitz/Development/PalamHealth/PalamHealth",
    }).map((s) => s.id);
    expect(inPh).toEqual(["palamhealth", "outline", "github"]);

    const inPremier = filterServers(servers, {
      layer: "project",
      cwd: "/home/blitz/Development/PremierStudio/web",
    }).map((s) => s.id);
    expect(inPremier).toEqual(["github"]);
  });

  it("never installs path-gated servers into the user layer", () => {
    const servers = [stdio("palamhealth", { layer: "project", whenPathContains: ["PalamHealth"] })];
    expect(
      filterServers(servers, {
        layer: "user",
        cwd: "/home/blitz/Development/PalamHealth/PalamHealth",
      }),
    ).toEqual([]);
  });

  it("matches any fragment in whenPathContains", () => {
    const servers = [
      stdio("ph", { layer: "project", whenPathContains: ["PalamHealth", "palamhealth"] }),
    ];
    expect(
      filterServers(servers, { layer: "project", cwd: "/tmp/palamhealth-scratch" }).map(
        (s) => s.id,
      ),
    ).toEqual(["ph"]);
  });
});
