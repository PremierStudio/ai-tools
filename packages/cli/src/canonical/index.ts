export { readConfig, writeConfig, getMode, isCanonical } from "./config.js";
export { readManifest, writeManifest, addEntry, removeEntry, getEntries } from "./manifest.js";
export { addManagedBlock, removeManagedBlock, hasManagedBlock } from "./gitignore.js";
export type {
  AiToolsConfig,
  AiToolsMode,
  Manifest,
  ManifestEntry,
  ManifestTarget,
} from "./types.js";
