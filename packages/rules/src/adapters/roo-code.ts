import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class RooCodeRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "roo-code";
  readonly name = "Roo Code";
  readonly nativeSupport = true;
  readonly configDir = ".roo/rules";
}

const adapter = new RooCodeRuleAdapter();
registry.register(adapter);
export default adapter;
