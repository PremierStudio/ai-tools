import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class AntigravityCliRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "antigravity-cli";
  readonly name = "Antigravity CLI";
  readonly nativeSupport = true;
  readonly configDir = ".agents/rules";
  readonly command = "antigravity";
}

const adapter = new AntigravityCliRuleAdapter();
registry.register(adapter);
export default adapter;
