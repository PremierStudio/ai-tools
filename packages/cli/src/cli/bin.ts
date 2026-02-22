import { run } from "./index.js";

process.env.AI_TOOLS_CLI_NAME = "ai-tools";

run(process.argv.slice(2)).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
