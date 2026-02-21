import { BaseRuleAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { RuleDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve, basename } from "node:path";

export class ClaudeCodeRuleAdapter extends BaseRuleAdapter {
  readonly id = "claude-code";
  readonly name = "Claude Code";
  readonly nativeSupport = true;
  readonly configDir = ".claude/rules";
  readonly command = "claude";

  async generate(rules: RuleDefinition[]): Promise<GeneratedFile[]> {
    return rules.map((rule) => ({
      path: `${this.configDir}/${rule.id}.md`,
      content: this.formatRule(rule),
      format: "md" as const,
    }));
  }

  async import(cwd?: string): Promise<RuleDefinition[]> {
    const dir = cwd ?? process.cwd();
    const rulesDir = resolve(dir, this.configDir);
    if (!existsSync(rulesDir)) return [];

    const files = await readdir(rulesDir);
    const rules: RuleDefinition[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(rulesDir, file), "utf-8");
      const id = basename(file, ".md");
      rules.push(this.parseRule(id, content));
    }

    return rules;
  }

  private formatRule(rule: RuleDefinition): string {
    let md = "---\n";
    if (rule.description) md += `description: ${rule.description}\n`;
    if (rule.scope.type === "glob" && rule.scope.patterns.length > 0) {
      md += "globs:\n";
      for (const pattern of rule.scope.patterns) {
        md += `  - "${pattern}"\n`;
      }
    }
    md += "---\n\n";
    md += rule.content + "\n";
    return md;
  }

  private parseRule(id: string, raw: string): RuleDefinition {
    const rule: RuleDefinition = { id, name: id, content: "", scope: { type: "always" } };

    if (raw.startsWith("---")) {
      const endIdx = raw.indexOf("---", 3);
      if (endIdx !== -1) {
        const fm = raw.slice(3, endIdx).trim();
        const body = raw.slice(endIdx + 3).trim();

        const globs: string[] = [];
        const lines = fm.split("\n");
        for (const line of lines) {
          if (line.startsWith("description:")) {
            rule.description = line.slice(12).trim();
          } else if (line.trim().startsWith("- ")) {
            const pattern = line
              .trim()
              .slice(2)
              .replace(/^["']|["']$/g, "");
            globs.push(pattern);
          }
        }

        if (globs.length > 0) {
          rule.scope = { type: "glob", patterns: globs };
        }

        rule.content = body;
      }
    } else {
      rule.content = raw.trim();
    }

    return rule;
  }
}

const adapter = new ClaudeCodeRuleAdapter();
registry.register(adapter);
export default adapter;
