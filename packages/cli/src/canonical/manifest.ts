import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { Manifest, ManifestEntry } from "./types.js";

const MANIFEST_FILE = ".ai-tools/manifest.json";

function emptyManifest(): Manifest {
  return { version: 1, entries: [] };
}

export async function readManifest(cwd?: string): Promise<Manifest> {
  const filePath = resolve(cwd ?? process.cwd(), MANIFEST_FILE);
  if (!existsSync(filePath)) return emptyManifest();
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as Manifest;
}

export async function writeManifest(manifest: Manifest, cwd?: string): Promise<void> {
  const filePath = resolve(cwd ?? process.cwd(), MANIFEST_FILE);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export async function addEntry(entry: ManifestEntry, cwd?: string): Promise<void> {
  const manifest = await readManifest(cwd);
  const idx = manifest.entries.findIndex((e) => e.engine === entry.engine && e.id === entry.id);
  if (idx >= 0) {
    manifest.entries[idx] = entry;
  } else {
    manifest.entries.push(entry);
  }
  await writeManifest(manifest, cwd);
}

export async function removeEntry(engine: string, id: string, cwd?: string): Promise<void> {
  const manifest = await readManifest(cwd);
  manifest.entries = manifest.entries.filter((e) => !(e.engine === engine && e.id === id));
  await writeManifest(manifest, cwd);
}

export async function getEntries(engine?: string, cwd?: string): Promise<ManifestEntry[]> {
  const manifest = await readManifest(cwd);
  if (engine) {
    return manifest.entries.filter((e) => e.engine === engine);
  }
  return manifest.entries;
}
