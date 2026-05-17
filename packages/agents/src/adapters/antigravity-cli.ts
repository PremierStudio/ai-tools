import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: AntigravityCliAgentAdapter, adapter } = createMarkdownAdapter({
  id: "antigravity-cli",
  name: "Antigravity CLI",
  configDir: ".agents/agents",
  command: "antigravity",
});

export { AntigravityCliAgentAdapter };
export default adapter;
