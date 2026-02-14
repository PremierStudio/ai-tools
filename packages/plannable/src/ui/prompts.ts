import * as p from "@clack/prompts";

function ensureNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }
  return value;
}

export async function askToolSelection(
  detected: Array<{ id: string; name: string }>,
  all: Array<{ id: string; name: string }>,
): Promise<string[]> {
  const detectedIds = new Set(detected.map((d) => d.id));
  const options = all.map((tool) => ({
    value: tool.id,
    label: tool.name,
    hint: detectedIds.has(tool.id) ? "detected" : undefined,
  }));

  return ensureNotCancelled(
    await p.multiselect({
      message: "Which AI tools should connect to Plannable?",
      options,
      initialValues: detected.map((d) => d.id),
      required: true,
    }),
  );
}

export async function askLanguageConfirm(language: string): Promise<string> {
  const confirmed = ensureNotCancelled(
    await p.confirm({
      message: `Detected project language: ${language}. Correct?`,
    }),
  );

  if (confirmed) return language;

  return ensureNotCancelled(
    await p.select({
      message: "Select your primary project language",
      options: [
        { value: "typescript", label: "TypeScript" },
        { value: "javascript", label: "JavaScript" },
        { value: "python", label: "Python" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
        { value: "csharp", label: ".NET / C#" },
        { value: "java", label: "Java / Kotlin" },
        { value: "ruby", label: "Ruby" },
        { value: "php", label: "PHP" },
      ],
    }),
  );
}

export type FeatureToggles = {
  guardrails: boolean;
  signals: boolean;
  protectedFiles: boolean;
};

type FeatureKey = "guardrails" | "signals" | "protectedFiles";

export async function askFeatureToggles(): Promise<FeatureToggles> {
  const features = ensureNotCancelled(
    await p.multiselect<FeatureKey>({
      message: "Which features do you want to enable?",
      options: [
        {
          value: "guardrails",
          label: "Code guardrails",
          hint: "language-specific linting hooks",
        },
        {
          value: "signals",
          label: "Activity signals",
          hint: "file, shell, tool usage tracking",
        },
        {
          value: "protectedFiles",
          label: "Protected files",
          hint: "block modifications to critical files",
        },
      ],
      initialValues: ["guardrails", "signals"],
      required: false,
    }),
  );

  return {
    guardrails: features.includes("guardrails"),
    signals: features.includes("signals"),
    protectedFiles: features.includes("protectedFiles"),
  };
}

export type McpScopeChoice = "global" | "project";

export async function askMcpScope(): Promise<McpScopeChoice> {
  return ensureNotCancelled(
    await p.select<McpScopeChoice>({
      message: "Where should the Plannable MCP connection be installed?",
      options: [
        {
          value: "global",
          label: "Global (all projects)",
          hint: "writes to user-level config (~/.claude/, ~/.cursor/, etc.)",
        },
        {
          value: "project",
          label: "This project only",
          hint: "writes to project-level config (.claude/, .cursor/, etc.)",
        },
      ],
    }),
  );
}

export async function askConfirm(message: string): Promise<boolean> {
  return ensureNotCancelled(await p.confirm({ message }));
}
