import { loadConfig } from "../config/index.js";
import { HookEngine } from "../runtime/index.js";
import { buildCompatEvent, isBlockingNativeEvent, payloadEventName } from "./claude-compat.js";
import { parseCompatPayload, readStdinText, type HookRunnerIO } from "./grok-runner.js";

/**
 * Execute configured ai-hooks for a ZCode command hook.
 * ZCode blocks PreToolUse / PermissionRequest / UserPromptSubmit with exit 2.
 * stdout is omitted on block because ZCode's JSON schema is strict.
 */
export async function runZcodeHook(io: HookRunnerIO = {}): Promise<number> {
  const env = io.env ?? process.env;
  const stderr = io.stderr ?? process.stderr;

  try {
    const raw = await readStdinText(io.stdin);
    const payload = parseCompatPayload(raw);
    const nativeEvent = payloadEventName(payload, env.ZCODE_HOOK_EVENT ?? env.CLAUDE_HOOK_EVENT);
    const event = buildCompatEvent(nativeEvent, payload, "zcode");
    if (!event) return 0;

    const config = io.config ?? (await loadConfig(undefined, io.cwd));
    const engine = new HookEngine(config);
    const results = await engine.emit(event, { name: "zcode", version: "1.0" });
    const blocked = results.find((result) => result.blocked);
    if (blocked && isBlockingNativeEvent(nativeEvent)) {
      stderr.write(blocked.reason ?? "Blocked by ai-hooks");
      return 2;
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`[ai-hooks] Error: ${message}\n`);
    return 0;
  }
}
