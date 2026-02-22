#!/usr/bin/env node

import { run } from "@premierstudio/ai-tools";

process.env.AI_TOOLS_CLI_NAME = "agentful";

run(process.argv.slice(2)).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
