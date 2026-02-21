import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class ClineRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "cline";
  readonly name = "Cline";
  readonly nativeSupport = true;
  readonly configDir = ".clinerules";
  readonly command = "cline";
}

const adapter = new ClineRuleAdapter();
registry.register(adapter);
export default adapter;
