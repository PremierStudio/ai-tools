import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: ZcodeAgentAdapter, adapter } = createMarkdownAdapter({
  id: "zcode",
  name: "ZCode",
  configDir: ".zcode/agents",
  command: "zcode",
});

export { ZcodeAgentAdapter };
export default adapter;
