import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: ClineAgentAdapter, adapter } = createMarkdownAdapter({
  id: "cline",
  name: "Cline",
  configDir: ".cline/agents",
  command: "cline",
});

export { ClineAgentAdapter };
export default adapter;
