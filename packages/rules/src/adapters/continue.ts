import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class ContinueRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "continue";
  readonly name = "Continue";
  readonly nativeSupport = true;
  readonly configDir = ".continue/rules";
}

const adapter = new ContinueRuleAdapter();
registry.register(adapter);
export default adapter;
