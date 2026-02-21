import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class DroidRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "droid";
  readonly name = "Droid";
  readonly nativeSupport = true;
  readonly configDir = ".factory/instructions";
  readonly command = "droid";
}

const adapter = new DroidRuleAdapter();
registry.register(adapter);
export default adapter;
