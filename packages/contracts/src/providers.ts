import type { FrameworkErrorCode } from "./errors.js";
import type { JsonObject } from "./persistence.js";

export const PROVIDER_CAPABILITIES = [
  "text_generation",
  "image_generation",
  "video_generation",
  "voice_generation",
  "music_generation",
  "subtitle_generation",
  "reference_analysis"
] as const;

export const PROVIDER_HEALTH_STATUSES = ["healthy", "degraded", "unavailable", "unknown"] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];
export type ProviderHealthStatus = (typeof PROVIDER_HEALTH_STATUSES)[number];
export type ProviderCredentialInput = Record<string, string>;

export interface ProviderMetadata {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  readonly capabilities: readonly ProviderCapability[];
}

export interface ProviderCredentialDescriptor {
  readonly key: string;
  readonly label: string;
  readonly required: boolean;
  readonly secret: boolean;
}

export interface ProviderHealthCheckRequest {
  readonly credentials?: ProviderCredentialInput;
  readonly metadata?: JsonObject;
}

export interface ProviderHealthCheckResult {
  readonly providerId: string;
  readonly status: ProviderHealthStatus;
  readonly checkedAt: string;
  readonly latencyMs?: number;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: JsonObject;
}

export interface ProviderGenerationRequest {
  readonly id: string;
  readonly capability: ProviderCapability;
  readonly payload: JsonObject;
  readonly metadata?: JsonObject;
}

export interface ProviderGenerationResponse {
  readonly requestId: string;
  readonly providerId: string;
  readonly capability: ProviderCapability;
  readonly output: JsonObject;
  readonly usage?: JsonObject;
  readonly metadata?: JsonObject;
}

export interface ProviderCancellationResult {
  readonly requestId: string;
  readonly cancelled: boolean;
  readonly humanReadableMessage: string;
}

export interface NormalizedProviderError {
  readonly code: FrameworkErrorCode;
  readonly providerId?: string;
  readonly retryable: boolean;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: JsonObject;
}

export type ProviderOperationResult<TData> =
  | {
      readonly ok: true;
      readonly data: TData;
    }
  | {
      readonly ok: false;
      readonly error: NormalizedProviderError;
    };
