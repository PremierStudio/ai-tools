export type SkillDefinition = {
  id: string;
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  enabled?: boolean;
};
