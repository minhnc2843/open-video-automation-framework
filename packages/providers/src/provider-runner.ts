import type {
  ProviderCancellationResult,
  ProviderCredentialInput,
  ProviderGenerationRequest,
  ProviderGenerationResponse,
  ProviderHealthCheckResult,
  ProviderOperationResult
} from "@ovaf/contracts";
import { normalizeProviderError } from "./errors.js";
import type { ProviderPlugin } from "./provider-plugin.js";
import { ProviderRegistry } from "./provider-registry.js";

export class ProviderRunner {
  constructor(private readonly registry: ProviderRegistry) {}

  async validateCredentials(providerId: string, credentials: ProviderCredentialInput): Promise<ProviderOperationResult<null>> {
    const plugin = this.registry.require(providerId);

    try {
      await plugin.validateCredentials(credentials);
      return {
        data: null,
        ok: true
      };
    } catch (error) {
      return {
        error: normalizePluginError(plugin, error, {
          humanReadableMessage: "Provider credentials are invalid.",
          code: "PROVIDER-CREDENTIALS-001"
        }),
        ok: false
      };
    }
  }

  async healthCheck(
    providerId: string,
    credentials?: ProviderCredentialInput
  ): Promise<ProviderOperationResult<ProviderHealthCheckResult>> {
    const plugin = this.registry.require(providerId);
    const startedAt = Date.now();

    try {
      const request = credentials === undefined ? {} : { credentials };
      const result = await plugin.healthCheck(request);
      return {
        data: {
          ...result,
          latencyMs: result.latencyMs ?? Date.now() - startedAt
        },
        ok: true
      };
    } catch (error) {
      return {
        error: normalizePluginError(plugin, error, {
          humanReadableMessage: "Provider health check failed.",
          code: "PROVIDER-HEALTH-001",
          retryable: true
        }),
        ok: false
      };
    }
  }

  async generate(
    providerId: string,
    request: ProviderGenerationRequest
  ): Promise<ProviderOperationResult<ProviderGenerationResponse>> {
    const plugin = this.registry.require(providerId);
    if (plugin.generate === undefined) {
      return {
        error: {
          code: "PROVIDER-CALL-001",
          humanReadableMessage: `Provider "${providerId}" does not support generation.`,
          providerId,
          retryable: false
        },
        ok: false
      };
    }

    try {
      const response = await plugin.generate(request);
      return {
        data: response,
        ok: true
      };
    } catch (error) {
      return {
        error: normalizePluginError(plugin, error, {
          humanReadableMessage: "Provider generation call failed.",
          code: "PROVIDER-CALL-001",
          retryable: true
        }),
        ok: false
      };
    }
  }

  async cancel(providerId: string, requestId: string): Promise<ProviderOperationResult<ProviderCancellationResult>> {
    const plugin = this.registry.require(providerId);
    if (plugin.cancel === undefined) {
      return {
        error: {
          code: "PROVIDER-CANCEL-001",
          humanReadableMessage: `Provider "${providerId}" does not support cancellation.`,
          providerId,
          retryable: false
        },
        ok: false
      };
    }

    try {
      return {
        data: await plugin.cancel(requestId),
        ok: true
      };
    } catch (error) {
      return {
        error: normalizePluginError(plugin, error, {
          humanReadableMessage: "Provider cancellation failed.",
          code: "PROVIDER-CANCEL-001",
          retryable: true
        }),
        ok: false
      };
    }
  }
}

function normalizePluginError(
  plugin: ProviderPlugin,
  error: unknown,
  fallback: {
    readonly code: "PROVIDER-CREDENTIALS-001" | "PROVIDER-HEALTH-001" | "PROVIDER-CALL-001" | "PROVIDER-CANCEL-001";
    readonly humanReadableMessage: string;
    readonly retryable?: boolean;
  }
) {
  return normalizeProviderError(
    plugin.normalizeError?.(error) ?? error,
    {
      ...fallback,
      providerId: plugin.metadata.id
    }
  );
}
