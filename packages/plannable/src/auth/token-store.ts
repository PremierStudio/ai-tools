import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type StoredAuth = {
  server_url: string;
  client_id: string;
  registration_access_token: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scopes: string[];
  team_id: string;
};

const TOKEN_DIR = join(homedir(), ".plannable");
const TOKEN_FILE = join(TOKEN_DIR, "auth.json");

export async function loadAuth(): Promise<StoredAuth | null> {
  if (!existsSync(TOKEN_FILE)) return null;

  try {
    const content = await readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(content) as StoredAuth;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: StoredAuth): Promise<void> {
  await mkdir(TOKEN_DIR, { recursive: true, mode: 0o700 });
  await writeFile(TOKEN_FILE, JSON.stringify(auth, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export async function clearAuth(): Promise<void> {
  if (existsSync(TOKEN_FILE)) {
    await rm(TOKEN_FILE);
  }
}

export function isTokenExpired(auth: StoredAuth): boolean {
  // Consider expired if within 60 seconds of expiry
  return Date.now() >= auth.expires_at - 60_000;
}

export function getAuthFilePath(): string {
  return TOKEN_FILE;
}
