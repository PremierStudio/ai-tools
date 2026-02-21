export { defineConfig } from "./config/index.js";
export { registry, BaseMCPAdapter } from "./adapters/index.js";

export type { MCPTransport, MCPServerDefinition, MCPConfig, GeneratedFile } from "./types/index.js";
export { CanonicalStore, Linker } from "./store/index.js";
export type { LinkStatus } from "./store/index.js";
