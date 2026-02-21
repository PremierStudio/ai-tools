import { SimpleMarkdownRuleAdapter } from "./simple-adapter.js";
import { registry } from "./registry.js";

export class CopilotRuleAdapter extends SimpleMarkdownRuleAdapter {
  readonly id = "copilot";
  readonly name = "Copilot";
  readonly nativeSupport = true;
  readonly configDir = ".github/instructions";
}

const adapter = new CopilotRuleAdapter();
registry.register(adapter);
export default adapter;
