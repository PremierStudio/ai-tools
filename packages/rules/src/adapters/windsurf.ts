import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class WindsurfRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "windsurf";
  readonly name = "Windsurf";
  readonly nativeSupport = true;
  readonly configDir = ".windsurf/rules";
  readonly command = "windsurf";
}

const adapter = new WindsurfRuleAdapter();
registry.register(adapter);
export default adapter;
