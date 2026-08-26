## [1.1.9](https://github.com/itz4blitz/ai-tools/compare/v1.1.8...v1.1.9) (2026-08-26)


### Bug Fixes

* **ci:** skip workspace reify during npm version ([196b350](https://github.com/itz4blitz/ai-tools/commit/196b35046373c518213fc401144ab277f4fe7a11))
* include README in the published npm package ([ef4637d](https://github.com/itz4blitz/ai-tools/commit/ef4637df4935a0b10d5c5c33034d68e93a473e5e))

## [1.1.8](https://github.com/itz4blitz/ai-tools/compare/v1.1.7...v1.1.8) (2026-02-14)


### Bug Fixes

* pin internal workspace deps to release version during publish ([9429701](https://github.com/itz4blitz/ai-tools/commit/942970183c940b80c623a0edfb0792fadb784df6))

## [1.1.7](https://github.com/itz4blitz/ai-tools/compare/v1.1.6...v1.1.7) (2026-02-14)


### Bug Fixes

* use globalThis singleton for adapter registry to survive module duplication ([48d3ae7](https://github.com/itz4blitz/ai-tools/commit/48d3ae70f75b0ea0e1a8a4b22849b9300e6fea1a))

## [1.1.6](https://github.com/itz4blitz/ai-tools/compare/v1.1.5...v1.1.6) (2026-02-14)


### Bug Fixes

* correct README tool table and remove staging URLs ([69b2c14](https://github.com/itz4blitz/ai-tools/commit/69b2c1458f4f0ee84762e0eb5af53bfc05bc77a8))

## [1.1.5](https://github.com/itz4blitz/ai-tools/compare/v1.1.4...v1.1.5) (2026-02-14)


### Bug Fixes

* read version at runtime instead of build-time define ([6a94951](https://github.com/itz4blitz/ai-tools/commit/6a9495150d97408b65ada407155ef5caf15123ce))

## [1.1.4](https://github.com/itz4blitz/ai-tools/compare/v1.1.3...v1.1.4) (2026-02-14)


### Bug Fixes

* resolve adapter registry singleton duplication and add dynamic versioning ([1c0941b](https://github.com/itz4blitz/ai-tools/commit/1c0941b39fd6b3f37ca92bf0164d6ca6c098c7b9))

## [1.1.3](https://github.com/itz4blitz/ai-tools/compare/v1.1.2...v1.1.3) (2026-02-14)


### Bug Fixes

* use OIDC trusted publisher for workspace publish auth ([3120dc8](https://github.com/itz4blitz/ai-tools/commit/3120dc8609d402e874c0db48ced568bca89cdf66))

## [1.1.2](https://github.com/itz4blitz/ai-tools/compare/v1.1.1...v1.1.2) (2026-02-14)


### Bug Fixes

* write npmrc at workspace root for publish auth ([2205d45](https://github.com/itz4blitz/ai-tools/commit/2205d45ee59c3b756cbf61c8705830795b547b04))

## [1.1.1](https://github.com/itz4blitz/ai-tools/compare/v1.1.0...v1.1.1) (2026-02-14)


### Bug Fixes

* write npmrc in package directory for workspace publish auth ([75b9f11](https://github.com/itz4blitz/ai-tools/commit/75b9f11dd89b028e3bd7b85418db98acd8aca305))

# [1.1.0](https://github.com/itz4blitz/ai-tools/compare/v1.0.7...v1.1.0) (2026-02-14)


### Features

* consolidate all adapters and CLI into single package ([91afad6](https://github.com/itz4blitz/ai-tools/commit/91afad6abf0dc399319f59f6c520ec15571ab202))

## [1.0.6](https://github.com/itz4blitz/ai-tools/compare/v1.0.5...v1.0.6) (2026-02-13)


### Bug Fixes

* remove --provenance from workspace publish script ([7bff7c8](https://github.com/itz4blitz/ai-tools/commit/7bff7c8e708fe58e7f2e88f637798b851b9b647e))

## [1.0.5](https://github.com/itz4blitz/ai-tools/compare/v1.0.4...v1.0.5) (2026-02-13)


### Bug Fixes

* add repository field to all packages for npm provenance ([020c3a2](https://github.com/itz4blitz/ai-tools/commit/020c3a28d6c8778af416a68930a72a7d4e510c77))

## [1.0.4](https://github.com/itz4blitz/ai-tools/compare/v1.0.3...v1.0.4) (2026-02-13)


### Bug Fixes

* add publishConfig access public to all scoped packages ([db9517b](https://github.com/itz4blitz/ai-tools/commit/db9517b308db6ceb51dc020532825be9f7e339bd))

## [1.0.3](https://github.com/itz4blitz/ai-tools/compare/v1.0.2...v1.0.3) (2026-02-13)


### Bug Fixes

* add public access for scoped npm package publishing ([0eff601](https://github.com/itz4blitz/ai-tools/commit/0eff6015988ad2b404d2e1ca3732764b1aef7040))

## [1.0.2](https://github.com/itz4blitz/ai-tools/compare/v1.0.1...v1.0.2) (2026-02-13)


### Bug Fixes

* update npm automation token for CI publishing ([91d0c76](https://github.com/itz4blitz/ai-tools/commit/91d0c76bde10c58422fc826fca6cc688452af6d6))

## [1.0.1](https://github.com/itz4blitz/ai-tools/compare/v1.0.0...v1.0.1) (2026-02-13)


### Bug Fixes

* clean up duplicate changelog entries from failed publish runs ([d4a96ae](https://github.com/itz4blitz/ai-tools/commit/d4a96aed4c144b6a9a860278328bc93bd87a4e39))

# 1.0.0 (2026-02-13)

### Features

* ai-hooks framework v1.0.0 ([17cf1af](https://github.com/itz4blitz/ai-tools/commit/17cf1af98e653183a98abe5ba7d07c051b66a7eb))
* add Cline adapter, remove adapters for tools without native hooks ([b18f45e](https://github.com/itz4blitz/ai-tools/commit/b18f45ed80d29f65235c3ff8dc4dff4eb8abd75e))

### Bug Fixes

* fetch full git history in publish job for semantic-release ([0df474a](https://github.com/itz4blitz/ai-tools/commit/0df474a817a5b155b8c9d5899ed1050fdaad05b5))
