export { run } from "./cli/index.js";

export const ENGINE_NAMES = ["hooks", "mcp", "skills", "agents", "rules"] as const;

export type EngineName = (typeof ENGINE_NAMES)[number];
