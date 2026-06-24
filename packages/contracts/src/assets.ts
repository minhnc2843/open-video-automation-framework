import type { JsonObject } from "./persistence.js";

export type AssetKind = "local" | "generated" | "remote";
export type CacheValidationState = "valid" | "missing" | "invalid";

export interface AssetRecord {
  readonly id: string;
  readonly kind: AssetKind;
  readonly hash: string;
  readonly sizeBytes: number;
  readonly storagePath: string;
  readonly originalPath?: string;
  readonly mimeType?: string;
  readonly createdAt: string;
}

export interface CacheEntry {
  readonly cacheKey: string;
  readonly inputFingerprint: string;
  readonly generatorVersion: string;
  readonly filePath: string;
  readonly createdAt: string;
  readonly validationState: CacheValidationState;
  readonly metadata?: JsonObject;
}

export interface CacheValidationResult {
  readonly state: CacheValidationState;
  readonly reason: string;
}

export interface SceneInputFingerprintInput {
  readonly scene: JsonObject;
  readonly renderSettings: JsonObject;
  readonly generatorVersion: string;
  readonly assetFingerprints?: readonly string[];
}
