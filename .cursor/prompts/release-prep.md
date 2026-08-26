# Prepare for release

Verify the codebase is ready for semantic-release on merge to master.

## Steps

1. Run `npm run check` — all four stages must pass (lint, format, typecheck, test)

2. Check recent commits follow conventional commit format (Angular preset):
   - `feat:` → minor release
   - `fix:`, `perf:`, `refactor:`, `revert:` → patch release
   - `docs:`, `chore:`, `style:`, `test:`, `ci:` → no release
   - `BREAKING CHANGE:` in footer → major release

3. Run `npm run release:publish:dry` to preview the `@itz4blitz/ai-tools` publish

4. Verify all internal workspace `package.json` files remain private implementation details and stay version-aligned with `packages/cli/package.json`

5. Check that `scripts/sync-versions.js`, `scripts/vendor-cli-bundle.js`, `scripts/clean-cli-bundle.js`, and `scripts/run-semantic-release.js` are intact and unmodified

6. If `@itz4blitz/ai-tools` has never been published before, ensure a one-time `NPM_TOKEN` secret is available for the bootstrap release. After the first publish, trusted publishing via OIDC should handle future releases.

Report the results: whether `@itz4blitz/ai-tools` is ready to publish, what version bump is expected, and any repo-side or npm-side blockers.
