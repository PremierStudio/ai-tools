import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class CodexRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "codex";
  readonly name = "Codex";
  readonly nativeSupport = true;
  readonly configDir = ".codex/instructions";
  readonly command = "codex";
}

const adapter = new CodexRuleAdapter();
registry.register(adapter);
export default adapter;
