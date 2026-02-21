import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: AmpAgentAdapter, adapter } = createMarkdownAdapter({
  id: "amp",
  name: "Amp",
  configDir: ".amp/agents",
  command: "amp",
});

export { AmpAgentAdapter };
export default adapter;
