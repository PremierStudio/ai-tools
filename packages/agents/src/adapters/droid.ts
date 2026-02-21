import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: DroidAgentAdapter, adapter } = createMarkdownAdapter({
  id: "droid",
  name: "Droid",
  configDir: ".factory/agents",
  command: "droid",
});

export { DroidAgentAdapter };
export default adapter;
