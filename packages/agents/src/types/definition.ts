export type AgentDefinition = {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  model?: string;
  tools?: string[];
  tags?: string[];
  enabled?: boolean;
};
