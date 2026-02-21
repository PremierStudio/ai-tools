import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: ClaudeCodeAgentAdapter, adapter } = createMarkdownAdapter({
  id: "claude-code",
  name: "Claude Code",
  configDir: ".claude/agents",
  command: "claude",
});

export { ClaudeCodeAgentAdapter };
export default adapter;
