import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class GrokRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "grok";
  readonly name = "Grok";
  readonly nativeSupport = true;
  readonly configDir = ".grok/rules";
  readonly command = "grok";
}

const adapter = new GrokRuleAdapter();
registry.register(adapter);
export default adapter;
