import { describe, expect, it } from "vitest";
import type {
  ProviderGenerationRequest,
  ProviderGenerationResponse,
  ProviderHealthCheckRequest,
  ProviderHealthCheckResult
} from "@ovaf/contracts";
import { ProviderCredentialVault } from "./credential-vault.js";
import { ProviderInfrastructureError } from "./errors.js";
import type { ProviderPlugin } from "./provider-plugin.js";
import { ProviderRegistry } from "./provider-registry.js";
import { ProviderRunner } from "./provider-runner.js";

describe("ProviderRegistry", () => {
  it("registers providers and finds them by capability", () => {
    const registry = new ProviderRegistry();
    registry.register(createProviderPlugin());

    expect(registry.list()).toEqual([
      {
        capabilities: ["text_generation"],
        displayName: "Test Provider",
        id: "test-provider",
        version: "0.0.0"
      }
    ]);
    expect(registry.findByCapability("text_generation")).toHaveLength(1);
    expect(registry.findByCapability("image_generation")).toHaveLength(0);
  });

  it("rejects duplicate provider ids", () => {
    const registry = new ProviderRegistry();
    registry.register(createProviderPlugin());

    expect(() => registry.register(createProviderPlugin())).toThrow(ProviderInfrastructureError);
  });

  it("requires registered providers", () => {
    const registry = new ProviderRegistry();

    expect(() => registry.require("missing")).toThrow(ProviderInfrastructureError);
  });
});

describe("ProviderCredentialVault", () => {
  it("encrypts and decrypts provider credentials without storing plaintext", () => {
    const vault = new ProviderCredentialVault({
      key: "x".repeat(32),
      keyId: "local-test",
      now: () => new Date("2026-06-25T00:00:00.000Z"),
      randomBytesProvider: (size) => Buffer.alloc(size, 7)
    });

    const envelope = vault.seal({
      apiKey: "secret-provider-key",
      region: "local"
    });

    expect(JSON.stringify(envelope)).not.toContain("secret-provider-key");
    expect(envelope).toMatchObject({
      algorithm: "aes-256-gcm",
      createdAt: "2026-06-25T00:00:00.000Z",
      keyId: "local-test"
    });
    expect(vault.open(envelope)).toEqual({
      apiKey: "secret-provider-key",
      region: "local"
    });
  });

  it("rejects weak encryption keys and wrong decrypt keys", () => {
    expect(() => new ProviderCredentialVault({ key: "too-short" })).toThrow(ProviderInfrastructureError);

    const envelope = new ProviderCredentialVault({ key: "x".repeat(32) }).seal({
      apiKey: "secret-provider-key"
    });
    const wrongVault = new ProviderCredentialVault({ key: "y".repeat(32) });

    expect(() => wrongVault.open(envelope)).toThrow(ProviderInfrastructureError);
  });
});

describe("ProviderRunner", () => {
  it("validates credentials, checks health and dispatches generation", async () => {
    const registry = new ProviderRegistry();
    registry.register(createProviderPlugin());
    const runner = new ProviderRunner(registry);

    await expect(runner.validateCredentials("test-provider", { apiKey: "valid-key" })).resolves.toEqual({
      data: null,
      ok: true
    });

    const health = await runner.healthCheck("test-provider", { apiKey: "valid-key" });
    expect(health).toMatchObject({
      ok: true,
      data: {
        providerId: "test-provider",
        status: "healthy"
      }
    });

    const response = await runner.generate("test-provider", {
      capability: "text_generation",
      id: "request-1",
      payload: {
        prompt: "Hello"
      }
    });

    expect(response).toEqual({
      data: {
        capability: "text_generation",
        output: {
          text: "generated"
        },
        providerId: "test-provider",
        requestId: "request-1"
      },
      ok: true
    });
  });

  it("returns normalized errors for provider failures", async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createProviderPlugin({
        healthCheck: () => {
          throw new Error("api_key=secret-provider-key failed upstream health check");
        }
      })
    );
    const runner = new ProviderRunner(registry);

    const result = await runner.healthCheck("test-provider", {
      apiKey: "secret-provider-key"
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      error: {
        code: "PROVIDER-HEALTH-001",
        providerId: "test-provider",
        retryable: true
      },
      ok: false
    });
    expect(JSON.stringify(result)).not.toContain("secret-provider-key");
  });

  it("redacts secrets from plugin-provided normalized errors", async () => {
    const registry = new ProviderRegistry();
    registry.register(
      createProviderPlugin({
        healthCheck: () => {
          throw new Error("upstream failed");
        },
        normalizeError: () => ({
          code: "PROVIDER-HEALTH-001",
          humanReadableMessage: "secret=secret-provider-key",
          providerId: "test-provider",
          retryable: true,
          technicalDetails: {
            apiKey: "secret-provider-key",
            note: "token=secret-provider-key"
          }
        })
      })
    );
    const runner = new ProviderRunner(registry);

    const result = await runner.healthCheck("test-provider", {
      apiKey: "secret-provider-key"
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-provider-key");
  });

  it("reports unsupported cancellation without throwing", async () => {
    const registry = new ProviderRegistry();
    registry.register(createProviderPlugin());
    const runner = new ProviderRunner(registry);

    const result = await runner.cancel("test-provider", "request-1");

    expect(result).toEqual({
      error: {
        code: "PROVIDER-CANCEL-001",
        humanReadableMessage: "Provider \"test-provider\" does not support cancellation.",
        providerId: "test-provider",
        retryable: false
      },
      ok: false
    });
  });
});

function createProviderPlugin(
  overrides: Partial<Pick<ProviderPlugin, "generate" | "healthCheck" | "normalizeError" | "validateCredentials">> = {}
): ProviderPlugin {
  const plugin: ProviderPlugin = {
    credentialDescriptors: [
      {
        key: "apiKey",
        label: "API key",
        required: true,
        secret: true
      }
    ],
    generate: overrides.generate ?? generate,
    healthCheck: overrides.healthCheck ?? healthCheck,
    metadata: {
      capabilities: ["text_generation"],
      displayName: "Test Provider",
      id: "test-provider",
      version: "0.0.0"
    },
    validateCredentials: overrides.validateCredentials ?? validateCredentials
  };

  return overrides.normalizeError === undefined
    ? plugin
    : {
        ...plugin,
        normalizeError: overrides.normalizeError
      };
}

function validateCredentials(credentials: Record<string, string>): void {
  if (credentials.apiKey !== "valid-key") {
    throw new Error("credential apiKey is invalid");
  }
}

async function healthCheck(_request: ProviderHealthCheckRequest): Promise<ProviderHealthCheckResult> {
  return {
    checkedAt: "2026-06-25T00:00:00.000Z",
    humanReadableMessage: "Provider is healthy.",
    providerId: "test-provider",
    status: "healthy"
  };
}

async function generate(request: ProviderGenerationRequest): Promise<ProviderGenerationResponse> {
  return {
    capability: request.capability,
    output: {
      text: "generated"
    },
    providerId: "test-provider",
    requestId: request.id
  };
}
