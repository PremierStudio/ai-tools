import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class GeminiCliRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "gemini-cli";
  readonly name = "Gemini CLI";
  readonly nativeSupport = true;
  readonly configDir = ".gemini/rules";
  readonly command = "gemini";
}

const adapter = new GeminiCliRuleAdapter();
registry.register(adapter);
export default adapter;
