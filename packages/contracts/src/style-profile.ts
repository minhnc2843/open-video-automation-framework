import type { FrameworkErrorCode } from "./errors.js";

export const STYLE_PROFILE_PROPERTY_KEYS = [
  "cameraMovement",
  "motionIntensity",
  "composition",
  "scenePacing",
  "transitionStyle",
  "textPlacement",
  "colorPalette",
  "lighting",
  "audioRhythm"
] as const;

export type StyleProfilePropertyKey = (typeof STYLE_PROFILE_PROPERTY_KEYS)[number];

export interface ReferenceVideoMetadata {
  readonly id: string;
  readonly fileName: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly fps?: number;
  readonly uploadedAt: string;
}

export interface StyleProfileProperty {
  readonly enabled: boolean;
  readonly strength: number;
  readonly summary: string;
  readonly evidence?: readonly string[];
}

export type StyleProfileProperties = {
  readonly [K in StyleProfilePropertyKey]: StyleProfileProperty;
};

export interface StyleProfileCapabilityWarning {
  readonly code: "STYLE-PROFILE-CAPABILITY-001";
  readonly severity: "info" | "warning";
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly property?: StyleProfilePropertyKey;
}

export interface StyleProfile {
  readonly version: "1.0";
  readonly referenceVideo: ReferenceVideoMetadata;
  readonly analysisProviderId?: string;
  readonly createdAt?: string;
  readonly properties: StyleProfileProperties;
  readonly warnings: readonly StyleProfileCapabilityWarning[];
}

export interface StyleProfileValidationIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
}

export interface StyleProfileValidationSuccess {
  readonly ok: true;
  readonly profile: StyleProfile;
}

export interface StyleProfileValidationFailure {
  readonly ok: false;
  readonly issues: readonly StyleProfileValidationIssue[];
}

export type StyleProfileValidationResult = StyleProfileValidationSuccess | StyleProfileValidationFailure;
