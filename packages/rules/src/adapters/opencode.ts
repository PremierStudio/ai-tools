import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class OpenCodeRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "opencode";
  readonly name = "OpenCode";
  readonly nativeSupport = true;
  readonly configDir = ".opencode/instructions";
  readonly command = "opencode";
}

const adapter = new OpenCodeRuleAdapter();
registry.register(adapter);
export default adapter;
