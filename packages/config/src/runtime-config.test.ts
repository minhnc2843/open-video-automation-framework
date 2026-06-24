import { describe, expect, it } from "vitest";
import { ConfigValidationError, loadRuntimeConfig } from "./runtime-config.js";

describe("loadRuntimeConfig", () => {
  it("loads defaults for local development", () => {
    const config = loadRuntimeConfig({});

    expect(config).toMatchObject({
      environment: "development",
      port: 3000,
      logLevel: "info",
      storageRoot: "storage",
      encryptionKeyConfigured: false
    });
    expect(config.storagePaths.output).toBe("storage/output");
  });

  it("rejects invalid port values", () => {
    expect(() => loadRuntimeConfig({ APP_PORT: "70000" })).toThrow(ConfigValidationError);
  });

  it("requires an encryption key in production", () => {
    expect(() => loadRuntimeConfig({ APP_ENV: "production" })).toThrow(ConfigValidationError);
  });

  it("does not expose encryption key values through validation details", () => {
    try {
      loadRuntimeConfig({
        APP_ENV: "production",
        APP_ENCRYPTION_KEY: "short-secret"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      const validationError = error as ConfigValidationError;
      expect(validationError.descriptor.technicalDetails).not.toContain("short-secret");
      return;
    }

    throw new Error("Expected invalid encryption key to throw.");
  });
});
