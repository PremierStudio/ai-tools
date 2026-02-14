/**
 * Opinionated hooks preset for Plannable's autonomous PM-AI.
 * When a developer installs this preset, Plannable can:
 *
 * 1. Assign and track work items via MCP
 * 2. Enforce coding standards via before hooks
 * 3. Validate work before it's marked complete
 * 4. Coordinate across multiple developers' AI tools
 * 5. Collect signals and metrics from development activity
 *
 * Usage in ai-hooks.config.ts:
 *   import { plannablePreset } from "@premierstudio/plannable";
 *
 *   export default defineConfig({
 *     extends: [plannablePreset()],
 *     hooks: [
 *       // Your additional hooks here
 *     ],
 *   });
 */
import { hook, builtinHooks } from "@premierstudio/ai-hooks";
import type { AiHooksConfig, HookDefinition } from "@premierstudio/ai-hooks";

export type PlannablePresetOptions = {
  /** Plannable server URL for MCP communication. */
  serverUrl?: string;
  /** Project ID in Plannable. */
  projectId?: string;
  /** Whether to enforce coding standards. Default: true. */
  enforceStandards?: boolean;
  /** Whether to collect activity signals. Default: true. */
  collectSignals?: boolean;
  /** Whether to include built-in security hooks. Default: true. */
  includeSecurityHooks?: boolean;
  /** File patterns to protect from modification. */
  protectedPatterns?: string[];
  /** Branch naming convention regex. */
  branchPattern?: RegExp;
};

/**
 * Create a Plannable preset configuration.
 */
export function plannablePreset(options: PlannablePresetOptions = {}): AiHooksConfig {
  const {
    enforceStandards = true,
    collectSignals = true,
    includeSecurityHooks = true,
    protectedPatterns = [],
    branchPattern,
  } = options;

  const hooks: HookDefinition[] = [];

  // Include built-in security hooks
  if (includeSecurityHooks) {
    hooks.push(...builtinHooks);
  }

  // Standards enforcement hooks
  if (enforceStandards) {
    hooks.push(enforceNoTodos);
    hooks.push(enforceNoConsoleLog);
    hooks.push(enforceTypeAnnotations);
  }

  // Signal collection hooks
  if (collectSignals) {
    hooks.push(signalFileActivity);
    hooks.push(signalShellActivity);
    hooks.push(signalToolUsage);
  }

  // Protected file patterns
  if (protectedPatterns.length > 0) {
    hooks.push(createProtectedFilesHook(protectedPatterns));
  }

  // Branch naming convention
  if (branchPattern) {
    hooks.push(createBranchNamingHook(branchPattern));
  }

  // Work tracking hooks
  hooks.push(trackSessionStart);
  hooks.push(trackSessionEnd);

  return { hooks };
}

// ── Standards Enforcement ──────────────────────────────────

const enforceNoTodos = hook("before", ["file:write", "file:edit"], async (ctx, next) => {
  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;

  // Check for TODO/FIXME/HACK comments
  if (/\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Code contains TODO/FIXME comments. Resolve the issue or create a work item instead.",
    });
    return;
  }

  await next();
})
  .id("plannable:no-todos")
  .name("No TODO Comments")
  .description("Enforces no TODO/FIXME/HACK comments - create work items instead")
  .priority(20)
  .build();

const enforceNoConsoleLog = hook("before", ["file:write", "file:edit"], async (ctx, next) => {
  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;

  const path = ctx.event.path;

  // Skip test files and config files
  if (
    path.includes(".test.") ||
    path.includes(".spec.") ||
    path.includes("__tests__") ||
    path.endsWith(".config.ts") ||
    path.endsWith(".config.js")
  ) {
    await next();
    return;
  }

  if (/console\.(log|debug|info)\s*\(/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not contain console.log/debug/info. Use a proper logger.",
    });
    return;
  }

  await next();
})
  .id("plannable:no-console-log")
  .name("No Console.log")
  .description("Enforces proper logging instead of console.log in production code")
  .priority(21)
  .build();

const enforceTypeAnnotations = hook("before", ["file:write", "file:edit"], async (ctx, next) => {
  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;

  const path = ctx.event.path;

  // Only check TypeScript files
  if (!path.endsWith(".ts") && !path.endsWith(".tsx")) {
    await next();
    return;
  }

  // Check for `any` type usage
  if (/:\s*any\b/.test(content) || /as\s+any\b/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "TypeScript 'any' type is not allowed. Use proper type annotations.",
    });
    return;
  }

  await next();
})
  .id("plannable:no-any")
  .name("No Any Types")
  .description("Enforces proper TypeScript types instead of 'any'")
  .priority(22)
  .build();

// ── Signal Collection ──────────────────────────────────────

const signalFileActivity = hook("after", ["tool:after"], async (ctx, next) => {
  ctx.results.push({
    data: {
      signal: {
        type: "file_activity",
        tool: ctx.tool.name,
        event: ctx.event.type,
        toolName: ctx.event.toolName,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();
})
  .id("plannable:signal-file-activity")
  .name("Signal: File Activity")
  .description("Collects file modification signals for Plannable's risk radar")
  .priority(900)
  .build();

const signalShellActivity = hook("after", ["shell:after"], async (ctx, next) => {
  ctx.results.push({
    data: {
      signal: {
        type: "shell_activity",
        tool: ctx.tool.name,
        command: ctx.event.command,
        exitCode: ctx.event.exitCode,
        duration: ctx.event.duration,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();
})
  .id("plannable:signal-shell-activity")
  .name("Signal: Shell Activity")
  .description("Collects shell command signals for velocity tracking")
  .priority(901)
  .build();

const signalToolUsage = hook("after", ["tool:after", "mcp:after"], async (ctx, next) => {
  ctx.results.push({
    data: {
      signal: {
        type: "tool_usage",
        tool: ctx.tool.name,
        toolName: ctx.event.type === "tool:after" ? ctx.event.toolName : "mcp",
        duration: ctx.event.duration,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();
})
  .id("plannable:signal-tool-usage")
  .name("Signal: Tool Usage")
  .description("Collects tool usage signals for Plannable's analytics")
  .priority(902)
  .build();

// ── Work Tracking ──────────────────────────────────────────

const trackSessionStart = hook("after", ["session:start"], async (ctx, next) => {
  ctx.results.push({
    data: {
      plannable: {
        event: "session_start",
        tool: ctx.tool.name,
        cwd: ctx.cwd,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();
})
  .id("plannable:track-session-start")
  .name("Track Session Start")
  .description("Notifies Plannable when a developer starts an AI coding session")
  .priority(800)
  .build();

const trackSessionEnd = hook("after", ["session:end"], async (ctx, next) => {
  ctx.results.push({
    data: {
      plannable: {
        event: "session_end",
        tool: ctx.tool.name,
        duration: ctx.event.duration,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();
})
  .id("plannable:track-session-end")
  .name("Track Session End")
  .description("Notifies Plannable when a developer ends an AI coding session")
  .priority(801)
  .build();

// ── Dynamic Hook Factories ─────────────────────────────────

function createProtectedFilesHook(patterns: string[]): HookDefinition {
  const regexes = patterns.map((p) => new RegExp(p));

  return hook("before", ["file:write", "file:edit", "file:delete"], async (ctx, next) => {
    const path = ctx.event.path;
    const matched = regexes.find((r) => r.test(path));

    if (matched) {
      ctx.results.push({
        blocked: true,
        reason: `File "${path}" is protected by Plannable policy. Pattern: ${matched.source}`,
      });
      return;
    }

    await next();
  })
    .id("plannable:protected-files")
    .name("Protected Files")
    .description("Prevents modification of files matching protected patterns")
    .priority(5)
    .build();
}

function createBranchNamingHook(pattern: RegExp): HookDefinition {
  return hook("before", ["shell:before"], async (ctx, next) => {
    const command = ctx.event.command;

    // Check git checkout -b and git branch commands
    const branchMatch = command.match(/git\s+(?:checkout\s+-b|branch)\s+(\S+)/);
    if (branchMatch) {
      const branchName = branchMatch[1];
      if (branchName && !pattern.test(branchName)) {
        ctx.results.push({
          blocked: true,
          reason: `Branch name "${branchName}" doesn't match required pattern: ${pattern.source}`,
        });
        return;
      }
    }

    await next();
  })
    .id("plannable:branch-naming")
    .name("Branch Naming Convention")
    .description("Enforces branch naming conventions")
    .priority(15)
    .build();
}

// ── Exports ────────────────────────────────────────────────

export {
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
};
