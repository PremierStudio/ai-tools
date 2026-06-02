import { describe, expect, it } from "vitest";

import { isNpmTokenValid, resolveReleaseMode } from "../../../../scripts/run-semantic-release.js";

describe("run-semantic-release", () => {
  it("skips initial publish when the bootstrap token is invalid and skipping is allowed", () => {
    expect(
      resolveReleaseMode({
        packageExists: false,
        hasNpmToken: true,
        npmTokenValid: false,
        allowMissingInitialNpmToken: true,
      }),
    ).toEqual({
      mode: "skip-initial-publish",
      publishReady: false,
      reason: "invalid-token",
    });
  });

  it("fails initial publish when the bootstrap token is invalid and skipping is not allowed", () => {
    expect(
      resolveReleaseMode({
        packageExists: false,
        hasNpmToken: true,
        npmTokenValid: false,
        allowMissingInitialNpmToken: false,
      }),
    ).toEqual({
      mode: "fail-initial-publish",
      publishReady: false,
      reason: "invalid-token",
    });
  });

  it("uses trusted publishing once the npm package already exists", () => {
    expect(
      resolveReleaseMode({
        packageExists: true,
        hasNpmToken: false,
        npmTokenValid: false,
        allowMissingInitialNpmToken: false,
      }),
    ).toEqual({
      mode: "publish-oidc",
      publishReady: true,
    });
  });

  it("bootstraps the first publish when a valid token is available", () => {
    expect(
      resolveReleaseMode({
        packageExists: false,
        hasNpmToken: true,
        npmTokenValid: true,
        allowMissingInitialNpmToken: false,
      }),
    ).toEqual({
      mode: "bootstrap-token",
      publishReady: true,
    });
  });

  it("verifies npm tokens before release", async () => {
    await expect(
      isNpmTokenValid("valid", async () => new Response("{}", { status: 200 })),
    ).resolves.toBe(true);

    await expect(
      isNpmTokenValid("invalid", async () => new Response("{}", { status: 401 })),
    ).resolves.toBe(false);
  });
});
