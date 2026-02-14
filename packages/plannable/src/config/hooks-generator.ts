import type { FeatureToggles } from "../ui/prompts.js";

type HookSnippet = {
  id: string;
  name: string;
  description: string;
  events: string;
  priority: number;
  body: string;
};

function universalHooks(features: FeatureToggles): HookSnippet[] {
  const hooks: HookSnippet[] = [];

  if (features.signals) {
    hooks.push(
      {
        id: "plannable:signal-file-activity",
        name: "Signal: File Activity",
        description: "Collects file modification signals for Plannable",
        events: '["tool:after"]',
        priority: 900,
        body: `  ctx.results.push({
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
  await next();`,
      },
      {
        id: "plannable:signal-shell-activity",
        name: "Signal: Shell Activity",
        description: "Collects shell command signals for velocity tracking",
        events: '["shell:after"]',
        priority: 901,
        body: `  ctx.results.push({
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
  await next();`,
      },
      {
        id: "plannable:signal-tool-usage",
        name: "Signal: Tool Usage",
        description: "Collects tool usage signals for analytics",
        events: '["tool:after", "mcp:after"]',
        priority: 902,
        body: `  ctx.results.push({
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
  await next();`,
      },
    );
  }

  // Work tracking hooks are always included
  hooks.push(
    {
      id: "plannable:track-session-start",
      name: "Track Session Start",
      description: "Notifies Plannable when a developer starts an AI coding session",
      events: '["session:start"]',
      priority: 800,
      body: `  ctx.results.push({
    data: {
      plannable: {
        event: "session_start",
        tool: ctx.tool.name,
        cwd: ctx.cwd,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();`,
    },
    {
      id: "plannable:track-session-end",
      name: "Track Session End",
      description: "Notifies Plannable when a developer ends an AI coding session",
      events: '["session:end"]',
      priority: 801,
      body: `  ctx.results.push({
    data: {
      plannable: {
        event: "session_end",
        tool: ctx.tool.name,
        duration: ctx.event.duration,
        timestamp: ctx.event.timestamp,
      },
    },
  });
  await next();`,
    },
  );

  return hooks;
}

function noTodosHook(): HookSnippet {
  return {
    id: "plannable:no-todos",
    name: "No TODO Comments",
    description: "Enforces no TODO/FIXME/HACK comments",
    events: '["file:write", "file:edit"]',
    priority: 20,
    body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  if (/\\/\\/\\s*(TODO|FIXME|HACK|XXX)\\b/i.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Code contains TODO/FIXME comments. Resolve the issue or create a work item instead.",
    });
    return;
  }
  await next();`,
  };
}

type LanguageHookSet = {
  hooks: HookSnippet[];
};

function typescriptHooks(): LanguageHookSet {
  return {
    hooks: [
      noTodosHook(),
      {
        id: "plannable:no-console-log",
        name: "No Console.log",
        description: "Enforces proper logging instead of console.log",
        events: '["file:write", "file:edit"]',
        priority: 21,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes(".test.") || path.includes(".spec.") || path.includes("__tests__") || path.endsWith(".config.ts") || path.endsWith(".config.js")) {
    await next();
    return;
  }
  if (/console\\.(log|debug|info)\\s*\\(/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not contain console.log/debug/info. Use a proper logger.",
    });
    return;
  }
  await next();`,
      },
      {
        id: "plannable:no-any",
        name: "No Any Types",
        description: "Enforces proper TypeScript types instead of 'any'",
        events: '["file:write", "file:edit"]',
        priority: 22,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (!path.endsWith(".ts") && !path.endsWith(".tsx")) {
    await next();
    return;
  }
  if (/:s*any\\b/.test(content) || /as\\s+any\\b/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "TypeScript 'any' type is not allowed. Use proper type annotations.",
    });
    return;
  }
  await next();`,
      },
    ],
  };
}

function pythonHooks(): LanguageHookSet {
  return {
    hooks: [
      noTodosHook(),
      {
        id: "plannable:no-debug-print",
        name: "No Debug Print",
        description: "Enforces no print() statements in production code",
        events: '["file:write", "file:edit"]',
        priority: 21,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes("test_") || path.includes("_test.py") || path.includes("conftest")) {
    await next();
    return;
  }
  if (/^\\s*print\\s*\\(/m.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not contain print() statements. Use a proper logger.",
    });
    return;
  }
  await next();`,
      },
      {
        id: "plannable:type-hints",
        name: "Type Hints Check",
        description: "Encourages type hints on function definitions",
        events: '["file:write", "file:edit"]',
        priority: 22,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (!path.endsWith(".py")) {
    await next();
    return;
  }
  if (/^def\\s+\\w+\\([^)]*\\)\\s*:/m.test(content) && !/->/.test(content)) {
    ctx.results.push({
      blocked: false,
      reason: "Consider adding return type hints to function definitions.",
    });
  }
  await next();`,
      },
    ],
  };
}

function goHooks(): LanguageHookSet {
  return {
    hooks: [
      noTodosHook(),
      {
        id: "plannable:no-fmt-println",
        name: "No fmt.Println",
        description: "Enforces proper logging instead of fmt.Println",
        events: '["file:write", "file:edit"]',
        priority: 21,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes("_test.go")) {
    await next();
    return;
  }
  if (/fmt\\.Print(ln|f)?\\s*\\(/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not use fmt.Print. Use a structured logger.",
    });
    return;
  }
  await next();`,
      },
      {
        id: "plannable:error-handling",
        name: "Error Handling Check",
        description: "Checks for ignored error returns in Go",
        events: '["file:write", "file:edit"]',
        priority: 22,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (!path.endsWith(".go")) {
    await next();
    return;
  }
  if (/\\b_\\s*=.*err/.test(content)) {
    ctx.results.push({
      blocked: false,
      reason: "Consider handling the error instead of ignoring it with _.",
    });
  }
  await next();`,
      },
    ],
  };
}

function rustHooks(): LanguageHookSet {
  return {
    hooks: [
      noTodosHook(),
      {
        id: "plannable:no-println",
        name: "No println! Macro",
        description: "Enforces proper logging instead of println!",
        events: '["file:write", "file:edit"]',
        priority: 21,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes("/tests/") || path.includes("/examples/")) {
    await next();
    return;
  }
  if (/println!\\s*\\(/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not use println!. Use a logging crate (log, tracing).",
    });
    return;
  }
  await next();`,
      },
      {
        id: "plannable:no-unwrap",
        name: "No Unwrap",
        description: "Discourages .unwrap() in production code",
        events: '["file:write", "file:edit"]',
        priority: 22,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes("/tests/") || path.includes("/examples/")) {
    await next();
    return;
  }
  if (/\\.unwrap\\(\\)/.test(content)) {
    ctx.results.push({
      blocked: false,
      reason: "Consider using ? operator or .expect() with a descriptive message instead of .unwrap().",
    });
  }
  await next();`,
      },
    ],
  };
}

function csharpHooks(): LanguageHookSet {
  return {
    hooks: [
      noTodosHook(),
      {
        id: "plannable:no-console-writeline",
        name: "No Console.WriteLine",
        description: "Enforces proper logging instead of Console.WriteLine",
        events: '["file:write", "file:edit"]',
        priority: 21,
        body: `  const content = ctx.event.type === "file:write" ? ctx.event.content : ctx.event.newContent;
  const path = ctx.event.path;
  if (path.includes("Test") || path.includes("test")) {
    await next();
    return;
  }
  if (/Console\\.Write(Line)?\\s*\\(/.test(content)) {
    ctx.results.push({
      blocked: true,
      reason: "Production code should not use Console.WriteLine. Use ILogger.",
    });
    return;
  }
  await next();`,
      },
    ],
  };
}

function getLanguageHooks(language: string): LanguageHookSet {
  switch (language) {
    case "typescript":
      return typescriptHooks();
    case "javascript":
      return typescriptHooks(); // Same console.log/no-any checks apply
    case "python":
      return pythonHooks();
    case "go":
      return goHooks();
    case "rust":
      return rustHooks();
    case "csharp":
      return csharpHooks();
    default:
      return { hooks: [noTodosHook()] };
  }
}

function renderHook(snippet: HookSnippet, phase: "before" | "after"): string {
  return `hook("${phase}", ${snippet.events}, async (ctx, next) => {
${snippet.body}
})
  .id("${snippet.id}")
  .name("${snippet.name}")
  .description("${snippet.description}")
  .priority(${snippet.priority})
  .build()`;
}

export function generateHooksSource(language: string, features: FeatureToggles): string {
  const allHooks: string[] = [];

  // Language-specific guardrails
  if (features.guardrails) {
    const langHooks = getLanguageHooks(language);
    for (const h of langHooks.hooks) {
      allHooks.push(renderHook(h, "before"));
    }
  }

  // Universal hooks (signals, tracking)
  const universal = universalHooks(features);
  for (const h of universal) {
    allHooks.push(renderHook(h, "after"));
  }

  return allHooks.join(",\n\n    ");
}
