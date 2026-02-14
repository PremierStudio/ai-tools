import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type DetectedLanguage = {
  primaryLanguage: string;
  frameworks: string[];
};

type MarkerCheck = {
  language: string;
  markers: string[];
  frameworkDetectors?: Array<{
    file: string;
    key: string;
    frameworks: Record<string, string>;
  }>;
};

const MARKER_CHECKS: MarkerCheck[] = [
  {
    language: "typescript",
    markers: ["tsconfig.json"],
    frameworkDetectors: [
      {
        file: "package.json",
        key: "dependencies",
        frameworks: {
          next: "Next.js",
          react: "React",
          vue: "Vue",
          angular: "Angular",
          svelte: "Svelte",
          express: "Express",
          fastify: "Fastify",
          hono: "Hono",
          nestjs: "NestJS",
        },
      },
    ],
  },
  {
    language: "javascript",
    markers: ["package.json", "jsconfig.json"],
    frameworkDetectors: [
      {
        file: "package.json",
        key: "dependencies",
        frameworks: {
          next: "Next.js",
          react: "React",
          vue: "Vue",
          express: "Express",
        },
      },
    ],
  },
  {
    language: "python",
    markers: ["pyproject.toml", "setup.py", "requirements.txt"],
    frameworkDetectors: [
      {
        file: "requirements.txt",
        key: "__raw__",
        frameworks: {
          django: "Django",
          flask: "Flask",
          fastapi: "FastAPI",
        },
      },
    ],
  },
  { language: "go", markers: ["go.mod"] },
  { language: "rust", markers: ["Cargo.toml"] },
  { language: "csharp", markers: ["*.csproj", "*.sln"] },
  { language: "java", markers: ["build.gradle", "pom.xml"] },
  { language: "ruby", markers: ["Gemfile"] },
  { language: "php", markers: ["composer.json"] },
];

async function detectFrameworks(
  cwd: string,
  detectors: MarkerCheck["frameworkDetectors"],
): Promise<string[]> {
  if (!detectors) return [];

  const frameworks: string[] = [];

  for (const detector of detectors) {
    const filePath = resolve(cwd, detector.file);
    if (!existsSync(filePath)) continue;

    try {
      const content = await readFile(filePath, "utf-8");

      if (detector.key === "__raw__") {
        // Plain text search (e.g., requirements.txt)
        const lower = content.toLowerCase();
        for (const [pkg, name] of Object.entries(detector.frameworks)) {
          if (lower.includes(pkg)) {
            frameworks.push(name);
          }
        }
      } else {
        // JSON key search (e.g., package.json dependencies)
        const json = JSON.parse(content) as Record<string, Record<string, unknown>>;
        const section = json[detector.key];
        if (section && typeof section === "object") {
          for (const [pkg, name] of Object.entries(detector.frameworks)) {
            if (pkg in section) {
              frameworks.push(name);
            }
          }
        }

        // Also check devDependencies for package.json
        if (detector.key === "dependencies") {
          const devSection = json["devDependencies"];
          if (devSection && typeof devSection === "object") {
            for (const [pkg, name] of Object.entries(detector.frameworks)) {
              if (pkg in devSection && !frameworks.includes(name)) {
                frameworks.push(name);
              }
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return frameworks;
}

function hasGlobMatch(cwd: string, pattern: string): boolean {
  // Simple glob: just check if any file matches *.ext
  if (pattern.startsWith("*")) {
    const ext = pattern.slice(1); // e.g., ".csproj"
    try {
      const entries = readdirSync(cwd);
      return entries.some((e) => e.endsWith(ext));
    } catch {
      return false;
    }
  }
  return existsSync(resolve(cwd, pattern));
}

export async function detectLanguage(cwd: string = process.cwd()): Promise<DetectedLanguage> {
  // Check for TypeScript specifically: must have tsconfig.json OR typescript in package.json
  const hasTsConfig = existsSync(resolve(cwd, "tsconfig.json"));
  if (!hasTsConfig) {
    // Check if package.json has typescript as a dependency
    const pkgPath = resolve(cwd, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(await readFile(pkgPath, "utf-8")) as Record<
          string,
          Record<string, unknown>
        >;
        const deps = pkg["dependencies"] ?? {};
        const devDeps = pkg["devDependencies"] ?? {};
        if ("typescript" in deps || "typescript" in devDeps) {
          const tsCheck = MARKER_CHECKS.find((c) => c.language === "typescript");
          const frameworks = await detectFrameworks(cwd, tsCheck?.frameworkDetectors);
          return { primaryLanguage: "typescript", frameworks };
        }
      } catch {
        // Ignore
      }
    }
  }

  for (const check of MARKER_CHECKS) {
    // For JavaScript, skip if we already matched TypeScript
    if (check.language === "javascript" && hasTsConfig) continue;

    const found = check.markers.some((marker) => hasGlobMatch(cwd, marker));
    if (found) {
      const frameworks = await detectFrameworks(cwd, check.frameworkDetectors);
      return { primaryLanguage: check.language, frameworks };
    }
  }

  return { primaryLanguage: "unknown", frameworks: [] };
}
