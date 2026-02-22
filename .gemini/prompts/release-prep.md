# Prepare for release

Verify the codebase is ready for semantic-release on merge to master.

## Steps

1. Run `npm run check` — all four stages must pass (lint, format, typecheck, test)

2. Check recent commits follow conventional commit format (Angular preset):
   - `feat:` → minor release
   - `fix:`, `perf:`, `refactor:`, `revert:` → patch release
   - `docs:`, `chore:`, `style:`, `test:`, `ci:` → no release
   - `BREAKING CHANGE:` in footer → major release

3. Run `npm run release:publish:dry` to preview what would be published

4. Verify all workspace package.json files have consistent versions

5. Check that `scripts/sync-versions.js` and `scripts/publish-workspaces.js` are intact and unmodified

Report the results: which packages will be published, what version bump is expected, and any issues found.
