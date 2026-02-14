import { registry } from "@premierstudio/ai-hooks/adapters";

// Import all adapters to register them
import "@premierstudio/ai-hooks/adapters/all";

const DEFAULT_SERVER = "https://plannable.ai";

const HELP = `
plannable - Connect AI coding tools to Plannable

USAGE:
  plannable [command] [options]

COMMANDS:
  setup       Interactive setup: login, detect tools, configure hooks (default)
  remove      Remove all Plannable configuration from this project
  status      Show current connection status
  help        Show this help message

OPTIONS:
  --server <url>   Plannable server URL (default: ${DEFAULT_SERVER})
                   Also configurable via PLANNABLE_SERVER env var

EXAMPLES:
  npx @premierstudio/plannable                          # Setup with production server
  npx @premierstudio/plannable --server https://plannable.dev   # Staging
  npx @premierstudio/plannable status                   # Check connection
  npx @premierstudio/plannable remove                   # Clean removal
`;

export { registry };

// Re-export preset (merged from @premierstudio/preset-plannable)
export {
  plannablePreset,
  enforceNoTodos,
  enforceNoConsoleLog,
  enforceTypeAnnotations,
  signalFileActivity,
  signalShellActivity,
  signalToolUsage,
  trackSessionStart,
  trackSessionEnd,
  createProtectedFilesHook,
  createBranchNamingHook,
} from "./preset.js";
export type { PlannablePresetOptions } from "./preset.js";

function resolveServerUrl(args: string[]): string {
  const serverIdx = args.indexOf("--server");
  const serverValue = serverIdx !== -1 ? args[serverIdx + 1] : undefined;
  if (serverValue) return serverValue;
  return process.env.PLANNABLE_SERVER ?? DEFAULT_SERVER;
}

function stripFlags(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--server") {
      i++; // skip value
    } else if (arg) {
      result.push(arg);
    }
  }
  return result;
}

export async function run(args: string[]): Promise<void> {
  const serverUrl = resolveServerUrl(args);
  const cleanArgs = stripFlags(args);
  const command = cleanArgs[0];

  switch (command) {
    case "setup":
    case undefined: {
      const { setupCommand } = await import("./commands/setup.js");
      await setupCommand(serverUrl);
      break;
    }
    case "remove": {
      const { removeCommand } = await import("./commands/remove.js");
      await removeCommand();
      break;
    }
    case "status": {
      const { statusCommand } = await import("./commands/status.js");
      await statusCommand();
      break;
    }
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}
