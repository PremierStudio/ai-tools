export type MCPTransport =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "sse"; url: string; headers?: Record<string, string> };

export type MCPServerDefinition = {
  id: string;
  name: string;
  description?: string;
  transport: MCPTransport;
  enabled?: boolean;
  tags?: string[];
};
