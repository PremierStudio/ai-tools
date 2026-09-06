export type MCPTransport =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "sse"; url: string; headers?: Record<string, string> }
  | { type: "http"; url: string; headers?: Record<string, string> };

export type MCPLayer = "user" | "project";

export type MCPServerDefinition = {
  id: string;
  name: string;
  description?: string;
  transport: MCPTransport;
  enabled?: boolean;
  tags?: string[];
  /** Where this server is installed. Missing layer means project. */
  layer?: MCPLayer;
  /** Project-layer servers install only when cwd contains one of these fragments. */
  whenPathContains?: string[];
};
