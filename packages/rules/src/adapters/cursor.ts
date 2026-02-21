import { BaseRuleAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { RuleDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

export class CursorRuleAdapter extends BaseRuleAdapter {
  readonly id = "cursor";
  readonly name = "Cursor";
  readonly nativeSupport = true;
  readonly configDir = ".cursor/rules";
  readonly command = "cursor";

  async generate(rules: RuleDefinition[]): Promise<GeneratedFile[]> {
    return rules.map((rule) => ({
      path: `${this.configDir}/${rule.id}/RULE.md`,
      content: this.formatRule(rule),
      format: "md" as const,
    }));
  }

  async import(cwd?: string): Promise<RuleDefinition[]> {
    const dir = cwd ?? process.cwd();
    const rulesDir = resolve(dir, this.configDir);
    if (!existsSync(rulesDir)) return [];

    const entries = await readdir(rulesDir);
    const rules: RuleDefinition[] = [];

    for (const entry of entries) {
      const rulePath = resolve(rulesDir, entry, "RULE.md");
      if (!existsSync(rulePath)) continue;
      const content = await readFile(rulePath, "utf-8");
      rules.push(this.parseRule(entry, content));
    }

    return rules;
  }

  private formatRule(rule: RuleDefinition): string {
    let md = "---\n";
    if (rule.description) md += `description: ${rule.description}\n`;
    md += `alwaysApply: ${rule.scope.type === "always"}\n`;
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
        let alwaysApply = false;

        const lines = fm.split("\n");
        for (const line of lines) {
          if (line.startsWith("description:")) {
            rule.description = line.slice(12).trim();
          } else if (line.startsWith("alwaysApply:")) {
            alwaysApply = line.slice(12).trim() === "true";
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
        } else if (alwaysApply) {
          rule.scope = { type: "always" };
        } else {
          rule.scope = { type: "manual" };
        }

        rule.content = body;
      }
    }

    return rule;
  }
}

const adapter = new CursorRuleAdapter();
registry.register(adapter);
export default adapter;
