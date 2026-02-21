import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: CopilotAgentAdapter, adapter } = createMarkdownAdapter({
  id: "copilot",
  name: "Copilot",
  configDir: ".github/agents",
});

export { CopilotAgentAdapter };
export default adapter;
