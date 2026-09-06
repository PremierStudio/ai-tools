import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class ZcodeRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "zcode";
  readonly name = "ZCode";
  readonly nativeSupport = true;
  readonly configDir = ".zcode/rules";
  readonly command = "zcode";
}

const adapter = new ZcodeRuleAdapter();
registry.register(adapter);
export default adapter;
