import { defineRulesConfig } from "@premierstudio/ai-rules";

export default defineRulesConfig({
  rules: [
    {
      id: "typescript-strict",
      name: "Strict TypeScript",
      content: `Strict TypeScript: \`noUnusedLocals\`, \`noUnusedParameters\`, \`noUncheckedIndexedAccess\` all enabled. No \`any\` — \`typescript/no-explicit-any\` is an error in oxlint. No \`_variable\` prefix for unused params — use \`void variable\` instead.`,
      scope: { type: "always" },
      priority: 1,
    },
    {
      id: "esm-only",
      name: "ESM only",
      content: `All packages are \`"type": "module"\`, target ES2023/Node 22. No CommonJS.`,
      scope: { type: "always" },
      priority: 1,
    },
    {
      id: "formatting",
      name: "Formatting",
      content: `oxfmt — double quotes, trailing commas, 100 char width, 2-space indent.`,
      scope: { type: "always" },
      priority: 2,
    },
    {
      id: "testing",
      name: "Testing conventions",
      content: `vitest with globals, co-located as \`*.test.ts\` next to source files, target 100% coverage.`,
      scope: { type: "glob", patterns: ["**/*.test.ts"] },
      priority: 2,
    },
    {
      id: "adapter-pattern",
      name: "Adapter pattern",
      content: `Each adapter extends its package's BaseAdapter and self-registers into a global registry on import. Importing \`adapters/all.ts\` registers all adapters for that engine.`,
      scope: { type: "glob", patterns: ["**/adapters/**"] },
      priority: 3,
    },
  ],
});
