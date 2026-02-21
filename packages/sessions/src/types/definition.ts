export type SessionMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolName?: string;
};

export type UnifiedSession = {
  id: string;
  tool: string;
  toolName: string;
  title?: string;
  projectPath?: string;
  startedAt: string;
  updatedAt: string;
  messageCount: number;
  messages: SessionMessage[];
  metadata?: Record<string, unknown>;
};

export type SessionContext = {
  sessionId: string;
  tool: string;
  title: string;
  summary: string;
  keyFiles: string[];
  keyDecisions: string[];
  lastActivity: string;
  handoffMarkdown: string;
};

export type SessionFilter = {
  tool?: string;
  projectPath?: string;
  since?: Date;
  limit?: number;
};
