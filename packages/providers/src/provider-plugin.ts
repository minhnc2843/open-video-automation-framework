import type {
  NormalizedProviderError,
  ProviderCancellationResult,
  ProviderCredentialDescriptor,
  ProviderGenerationRequest,
  ProviderGenerationResponse,
  ProviderHealthCheckRequest,
  ProviderHealthCheckResult,
  ProviderMetadata
} from "@ovaf/contracts";

export interface ProviderPlugin {
  readonly metadata: ProviderMetadata;
  readonly credentialDescriptors: readonly ProviderCredentialDescriptor[];
  readonly validateCredentials: (credentials: Record<string, string>) => Promise<void> | void;
  readonly healthCheck: (request: ProviderHealthCheckRequest) => Promise<ProviderHealthCheckResult>;
  readonly generate?: (request: ProviderGenerationRequest) => Promise<ProviderGenerationResponse>;
  readonly cancel?: (requestId: string) => Promise<ProviderCancellationResult>;
  readonly normalizeError?: (error: unknown) => NormalizedProviderError;
}
