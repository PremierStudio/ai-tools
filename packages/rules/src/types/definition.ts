export type RuleScope =
  | { type: "always" }
  | { type: "glob"; patterns: string[] }
  | { type: "manual" }
  | { type: "agent"; agentId: string };

export type RuleDefinition = {
  id: string;
  name: string;
  description?: string;
  content: string;
  scope: RuleScope;
  priority?: number;
  tags?: string[];
  enabled?: boolean;
};
