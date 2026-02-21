import { symlink, readlink, unlink, mkdir, copyFile } from "node:fs/promises";
import { existsSync, lstatSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

export type LinkStatus = "linked" | "stale" | "missing" | "direct";

export class Linker {
  /**
   * Create a relative symlink from source to target.
   * Falls back to copy on EPERM (Windows without dev mode).
   */
  async link(source: string, target: string): Promise<void> {
    await mkdir(dirname(target), { recursive: true });

    // Remove existing target
    if (existsSync(target)) {
      await unlink(target);
    }

    const rel = relative(dirname(target), source);
    try {
      await symlink(rel, target);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EPERM") {
        await copyFile(source, target);
      } else {
        throw err;
      }
    }
  }

  /**
   * Check the status of a target path relative to its expected source.
   */
  async status(target: string, expectedSource: string): Promise<LinkStatus> {
    if (!existsSync(target)) return "missing";

    const stat = lstatSync(target);
    if (!stat.isSymbolicLink()) return "direct";

    try {
      const linkTarget = await readlink(target);
      const resolvedLink = resolve(dirname(target), linkTarget);
      const resolvedSource = resolve(expectedSource);
      return resolvedLink === resolvedSource ? "linked" : "stale";
    } catch {
      return "stale";
    }
  }

  /**
   * Remove a symlink or copied file at target.
   */
  async unlink(target: string): Promise<boolean> {
    if (!existsSync(target)) return false;
    await unlink(target);
    return true;
  }
}
