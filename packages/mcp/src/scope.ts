import type { MCPLayer, MCPServerDefinition } from "./types/index.js";

export type InstallContext = {
  layer: MCPLayer;
  cwd: string;
};

export function filterServers(
  servers: MCPServerDefinition[],
  ctx: InstallContext,
): MCPServerDefinition[] {
  return servers.filter((server) => {
    const layer = server.layer ?? "project";
    if (layer !== ctx.layer) return false;
    const fragments = server.whenPathContains ?? [];
    if (fragments.length === 0) return true;
    return fragments.some((fragment) => ctx.cwd.includes(fragment));
  });
}
