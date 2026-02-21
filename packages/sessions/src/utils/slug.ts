/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a session slug from tool + project path.
 */
export function sessionSlug(tool: string, projectPath?: string): string {
  const parts = [tool];
  if (projectPath) {
    parts.push(slugify(projectPath.replace(/^.*\//, "")));
  }
  parts.push(Date.now().toString(36));
  return parts.join("-");
}
