import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { writeConfig, isCanonical, getMode } from "./config.js";
import { readManifest, writeManifest } from "./manifest.js";
import { addManagedBlock, removeManagedBlock, hasManagedBlock } from "./gitignore.js";
import type { AiToolsConfig, ManifestEntry, ManifestTarget } from "./types.js";

type EngineModule = {
  name: string;
  pkg: string;
  configPkg: string;
};

const ENGINES: EngineModule[] = [
  {
    name: "hooks",
    pkg: "@itz4blitz/ai-tools-hooks/cli",
    configPkg: "@itz4blitz/ai-tools-hooks",
  },
  { name: "mcp", pkg: "@itz4blitz/ai-tools-mcp/cli", configPkg: "@itz4blitz/ai-tools-mcp" },
  {
    name: "skills",
    pkg: "@itz4blitz/ai-tools-skills/cli",
    configPkg: "@itz4blitz/ai-tools-skills",
  },
  {
    name: "agents",
    pkg: "@itz4blitz/ai-tools-agents/cli",
    configPkg: "@itz4blitz/ai-tools-agents",
  },
  {
    name: "rules",
    pkg: "@itz4blitz/ai-tools-rules/cli",
    configPkg: "@itz4blitz/ai-tools-rules",
  },
];

const TOOL_TARGETS: Array<{ dir: string; adapterId: string }> = [
  { dir: ".claude", adapterId: "claude-code" },
  { dir: ".cursor", adapterId: "cursor" },
  { dir: ".opencode", adapterId: "opencode" },
  { dir: ".gemini", adapterId: "gemini-cli" },
  { dir: ".cline", adapterId: "cline" },
  { dir: ".factory", adapterId: "droid" },
  { dir: ".codex", adapterId: "codex" },
  { dir: ".kiro", adapterId: "kiro" },
  { dir: ".amp", adapterId: "amp" },
  { dir: ".grok", adapterId: "grok" },
  { dir: ".zcode", adapterId: "zcode" },
  { dir: ".continue", adapterId: "continue" },
  { dir: ".roo", adapterId: "roo-code" },
  { dir: ".agents", adapterId: "antigravity-cli" },
];

const TOOL_DIRS = TOOL_TARGETS.map((target) => target.dir);

function presentToolTargets(cwd: string): ManifestTarget[] {
  return TOOL_TARGETS.filter((target) => existsSync(resolve(cwd, target.dir))).map((target) => ({
    adapterId: target.adapterId,
    targetPath: target.dir,
    strategy: "transform" as const,
    status: "direct" as const,
  }));
}

function hasFlag(flags: string[], flag: string): boolean {
  return flags.includes(flag);
}

// ── init ────────────────────────────────────────────────────

export async function cmdInit(flags: string[]): Promise<void> {
  const dryRun = hasFlag(flags, "--dry-run");

  const existing = await getMode();
  if (existing === "canonical") {
    console.log("Already initialized in canonical mode.");
    return;
  }

  const config: AiToolsConfig = {
    mode: "canonical",
    createdAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log("[dry-run] Would create .ai-tools/config.json");
    console.log("[dry-run] Would add managed block to .gitignore");
    return;
  }

  await writeConfig(config);
  await addManagedBlock();

  console.log("Initialized .ai-tools/ in canonical mode.");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run: ai-tools generate   (write engine files from configs)");
  console.log("  2. Run: ai-tools install    (install to tool directories)");
  console.log("  3. Run: ai-tools status     (check installation health)");
}

// ── generate ────────────────────────────────────────────────

export async function cmdGenerate(flags: string[]): Promise<void> {
  const dryRun = hasFlag(flags, "--dry-run");

  const canonical = await isCanonical();
  if (!canonical) {
    console.error("Not in canonical mode. Run 'ai-tools init' first.");
    return;
  }

  console.log("Generating engine files from configs...\n");

  for (const engine of ENGINES) {
    try {
      const mod = (await import(engine.pkg)) as { run: (args: string[]) => Promise<void> };
      const generateArgs = ["generate", ...flags];
      if (dryRun) {
        console.log(`  [dry-run] ${engine.name}: would generate`);
      } else {
        console.log(`  ${engine.name}: generating...`);
        await mod.run(generateArgs);
      }
    } catch (err) {
      console.error(`  ${engine.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\nDone!");
}

// ── install ─────────────────────────────────────────────────

export async function cmdInstall(flags: string[]): Promise<void> {
  const dryRun = hasFlag(flags, "--dry-run");

  const canonical = await isCanonical();
  if (!canonical) {
    console.error("Not in canonical mode. Run 'ai-tools init' first.");
    return;
  }

  console.log("Installing engine configs into tool directories...\n");

  const manifest = await readManifest();
  let totalInstalled = 0;
  const cwd = process.cwd();

  for (const engine of ENGINES) {
    try {
      const mod = (await import(engine.pkg)) as { run: (args: string[]) => Promise<void> };
      const installArgs = ["install", ...flags];
      if (dryRun) {
        console.log(`  [dry-run] ${engine.name}: would install`);
      } else {
        console.log(`  ${engine.name}: installing...`);
        await mod.run(installArgs);
        totalInstalled++;

        const entry: ManifestEntry = {
          engine: engine.name,
          id: engine.name,
          canonicalPath: `.ai-tools/${engine.name}/`,
          targets: presentToolTargets(cwd),
          updatedAt: new Date().toISOString(),
        };

        const idx = manifest.entries.findIndex(
          (e) => e.engine === entry.engine && e.id === entry.id,
        );
        if (idx >= 0) {
          manifest.entries[idx] = entry;
        } else {
          manifest.entries.push(entry);
        }
      }
    } catch (err) {
      console.error(`  ${engine.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun) {
    await writeManifest(manifest);
  }

  console.log(`\nInstalled ${totalInstalled} engine(s).`);
}

// ── status ──────────────────────────────────────────────────

export async function cmdStatus(flags: string[]): Promise<void> {
  void flags;

  const mode = await getMode();
  const hasGitignore = await hasManagedBlock();
  const manifest = await readManifest();

  console.log(`Mode: ${mode}`);
  console.log(`Gitignore managed: ${hasGitignore ? "yes" : "no"}`);
  console.log(`Manifest entries: ${manifest.entries.length}`);

  if (manifest.entries.length > 0) {
    console.log("\nEntries:");
    for (const entry of manifest.entries) {
      const targetInfo = entry.targets
        .map((t: ManifestTarget) => `${t.adapterId}(${t.status})`)
        .join(", ");
      console.log(`  ${entry.engine}/${entry.id}: ${targetInfo || "no targets"}`);
    }
  }

  // Check for tool directories
  const cwd = process.cwd();

  console.log("\nTool directories:");
  for (const dir of TOOL_DIRS) {
    const exists = existsSync(resolve(cwd, dir));
    const icon = exists ? "+" : "-";
    console.log(`  ${icon} ${dir}`);
  }
}

// ── clean ───────────────────────────────────────────────────

export async function cmdClean(flags: string[]): Promise<void> {
  const dryRun = hasFlag(flags, "--dry-run");

  const cwd = process.cwd();

  console.log("Cleaning tool-specific directories...\n");

  let cleaned = 0;
  for (const dir of TOOL_DIRS) {
    const fullPath = resolve(cwd, dir);
    if (existsSync(fullPath)) {
      if (dryRun) {
        console.log(`  [dry-run] Would remove: ${dir}`);
      } else {
        await rm(fullPath, { recursive: true });
        console.log(`  Removed: ${dir}`);
      }
      cleaned++;
    }
  }

  if (!dryRun) {
    await removeManagedBlock();
  }

  if (cleaned === 0) {
    console.log("  No tool directories found.");
  } else {
    console.log(`\nCleaned ${cleaned} director${cleaned === 1 ? "y" : "ies"}.`);
  }
}
