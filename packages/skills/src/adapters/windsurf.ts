import { BaseSkillAdapter } from "./base.js";
import { registry } from "./registry.js";
import type { SkillDefinition, GeneratedFile } from "../types/index.js";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve, basename } from "node:path";

class WindsurfSkillAdapter extends BaseSkillAdapter {
  readonly id = "windsurf";
  readonly name = "Windsurf";
  readonly nativeSupport = true;
  readonly configDir = ".windsurf/skills";
  readonly command = "windsurf";

  async generate(skills: SkillDefinition[]): Promise<GeneratedFile[]> {
    return skills.map((skill) => ({
      path: `${this.configDir}/${skill.id}.md`,
      content: this.formatSkill(skill),
      format: "md" as const,
    }));
  }

  async import(cwd?: string): Promise<SkillDefinition[]> {
    const dir = cwd ?? process.cwd();
    const skillsDir = resolve(dir, this.configDir);
    if (!existsSync(skillsDir)) return [];

    const files = await readdir(skillsDir);
    const skills: SkillDefinition[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(resolve(skillsDir, file), "utf-8");
      const id = basename(file, ".md");
      skills.push(this.parseSkill(id, content));
    }

    return skills;
  }

  private formatSkill(skill: SkillDefinition): string {
    let md = `# ${skill.name}\n\n`;
    if (skill.description) md += `${skill.description}\n\n`;
    md += skill.content + "\n";
    return md;
  }

  private parseSkill(id: string, raw: string): SkillDefinition {
    const lines = raw.trim().split("\n");
    let name = id;
    let contentStart = 0;

    if (lines[0]?.startsWith("# ")) {
      name = lines[0].slice(2).trim();
      contentStart = 1;
      if (lines[contentStart]?.trim() === "") contentStart++;
    }

    const content = lines.slice(contentStart).join("\n").trim();
    return { id, name, content };
  }
}

const adapter = new WindsurfSkillAdapter();
registry.register(adapter);
export { WindsurfSkillAdapter };
export default adapter;
