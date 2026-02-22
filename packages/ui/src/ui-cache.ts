import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import type { ToolInfo } from "./types.js";
import type { EngineStatus } from "./widgets/config-dashboard.js";
import type { SessionRow } from "./widgets/session-browser.js";

const CACHE_VERSION = 1;
const CACHE_DIR = resolve(homedir(), ".ai-tools", "ui-cache");

export type UiCacheData = {
  tools: ToolInfo[];
  sessions: SessionRow[];
  engines: EngineStatus[];
  mode: string;
  configHealth: string;
  sessionCount: number;
};

export type UiCacheTtl = {
  toolsMs: number;
  sessionsMs: number;
  configMs: number;
};

type UiCacheSliceTimestamps = {
  tools: string;
  sessions: string;
  config: string;
};

type UiCacheRecord = {
  version: number;
  updatedAt: string;
  cwd: string;
  slices: UiCacheSliceTimestamps;
  data: UiCacheData;
};

export type UiCacheSnapshot = {
  data: UiCacheData;
  updatedAt: string;
  ageMs: number;
  fresh: boolean;
  freshBySlice: {
    tools: boolean;
    sessions: boolean;
    config: boolean;
  };
};

function cacheFilePath(cwd: string): string {
  const normalized = resolve(cwd);
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return resolve(CACHE_DIR, `${hash}.json`);
}

function isUiCacheData(value: unknown): value is UiCacheData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.tools) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.engines) &&
    typeof candidate.mode === "string" &&
    typeof candidate.configHealth === "string" &&
    typeof candidate.sessionCount === "number"
  );
}

function isUiCacheRecord(value: unknown): value is UiCacheRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.cwd === "string" &&
    !!candidate.slices &&
    typeof (candidate.slices as Record<string, unknown>).tools === "string" &&
    typeof (candidate.slices as Record<string, unknown>).sessions === "string" &&
    typeof (candidate.slices as Record<string, unknown>).config === "string" &&
    isUiCacheData(candidate.data)
  );
}

export async function readUiCache(
  cwd: string,
  ttl: UiCacheTtl = { toolsMs: 45_000, sessionsMs: 20_000, configMs: 60_000 },
): Promise<UiCacheSnapshot | null> {
  const filePath = cacheFilePath(cwd);
  if (!existsSync(filePath)) return null;

  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!isUiCacheRecord(parsed)) return null;
    if (parsed.version !== CACHE_VERSION) return null;

    const updatedAtMs = new Date(parsed.updatedAt).getTime();
    if (Number.isNaN(updatedAtMs)) return null;
    const ageMs = Date.now() - updatedAtMs;
    const toolsAgeMs = Date.now() - new Date(parsed.slices.tools).getTime();
    const sessionsAgeMs = Date.now() - new Date(parsed.slices.sessions).getTime();
    const configAgeMs = Date.now() - new Date(parsed.slices.config).getTime();
    const freshBySlice = {
      tools: Number.isFinite(toolsAgeMs) && toolsAgeMs <= ttl.toolsMs,
      sessions: Number.isFinite(sessionsAgeMs) && sessionsAgeMs <= ttl.sessionsMs,
      config: Number.isFinite(configAgeMs) && configAgeMs <= ttl.configMs,
    };

    return {
      data: parsed.data,
      updatedAt: parsed.updatedAt,
      ageMs,
      fresh: freshBySlice.tools && freshBySlice.sessions && freshBySlice.config,
      freshBySlice,
    };
  } catch {
    return null;
  }
}

export async function writeUiCache(
  cwd: string,
  data: UiCacheData,
  slices?: Partial<UiCacheSliceTimestamps>,
): Promise<void> {
  const filePath = cacheFilePath(cwd);
  await mkdir(CACHE_DIR, { recursive: true });
  const now = new Date().toISOString();

  const payload: UiCacheRecord = {
    version: CACHE_VERSION,
    updatedAt: now,
    cwd: resolve(cwd),
    slices: {
      tools: slices?.tools ?? now,
      sessions: slices?.sessions ?? now,
      config: slices?.config ?? now,
    },
    data,
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}
