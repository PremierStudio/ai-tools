import { createMarkdownAdapter } from "./markdown-adapter.js";

const { Adapter: GeminiCliAgentAdapter, adapter } = createMarkdownAdapter({
  id: "gemini-cli",
  name: "Gemini CLI",
  configDir: ".gemini/agents",
  command: "gemini",
});

export { GeminiCliAgentAdapter };
export default adapter;
