import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: GrokAgentAdapter, adapter } = createMarkdownAdapter({
  id: "grok",
  name: "Grok",
  configDir: ".grok/agents",
  command: "grok",
});

export { GrokAgentAdapter };
export default adapter;
