import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class AmpRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "amp";
  readonly name = "Amp";
  readonly nativeSupport = true;
  readonly configDir = ".amp/rules";
  readonly command = "amp";
}

const adapter = new AmpRuleAdapter();
registry.register(adapter);
export default adapter;
