import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class KiroRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "kiro";
  readonly name = "Kiro";
  readonly nativeSupport = true;
  readonly configDir = ".kiro/steering";
  readonly command = "kiro";
}

const adapter = new KiroRuleAdapter();
registry.register(adapter);
export default adapter;
