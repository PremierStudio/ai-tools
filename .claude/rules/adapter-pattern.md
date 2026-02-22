---
globs:
  - "**/adapters/**"
---

Each adapter extends its package's BaseAdapter and self-registers into a global registry on import. Importing `adapters/all.ts` registers all adapters for that engine.
