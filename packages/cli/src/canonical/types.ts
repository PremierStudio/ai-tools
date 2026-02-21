export type AiToolsMode = "canonical" | "direct";

export type AiToolsConfig = {
  mode: AiToolsMode;
  createdAt: string;
};

export type ManifestEntry = {
  engine: string;
  id: string;
  canonicalPath: string;
  targets: ManifestTarget[];
  updatedAt: string;
};

export type ManifestTarget = {
  adapterId: string;
  targetPath: string;
  strategy: "symlink" | "transform";
  status: "linked" | "stale" | "missing" | "direct";
};

export type Manifest = {
  version: 1;
  entries: ManifestEntry[];
};
