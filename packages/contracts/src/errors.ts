export const FRAMEWORK_ERROR_CODES = [
  "CONFIG-ENV-001",
  "CONFIG-ENV-002",
  "CONTRACT-001",
  "EVENT-001",
  "SCRIPT-SCHEMA-001",
  "SCRIPT-SEMANTIC-001",
  "SCRIPT-SEMANTIC-002",
  "SCRIPT-SEMANTIC-003",
  "SCRIPT-SEMANTIC-004",
  "SCRIPT-ASSET-001",
  "TIMELINE-TIME-001",
  "TIMELINE-TIME-002",
  "TIMELINE-TIME-003",
  "ASSET-HASH-001",
  "ASSET-PATH-001",
  "CACHE-VALIDATION-001",
  "JOB-STATE-001",
  "JOB-STATE-002",
  "LOGGER-REDACTION-001",
  "RENDERER-HTML-001",
  "RENDERER-CAPTURE-001",
  "RENDERER-CACHE-001",
  "ENCODER-FFMPEG-001",
  "ENCODER-AUDIO-001",
  "OUTPUT-VALIDATION-001",
  "PROVIDER-REGISTRY-001",
  "PROVIDER-CREDENTIALS-001",
  "PROVIDER-HEALTH-001",
  "PROVIDER-CALL-001",
  "PROVIDER-CANCEL-001",
  "MEDIA-VOICE-001",
  "MEDIA-SUBTITLE-001",
  "MEDIA-MUSIC-001",
  "MEDIA-TIMING-001",
  "MEDIA-CACHE-001",
  "REFERENCE-VIDEO-METADATA-001",
  "STYLE-PROFILE-SCHEMA-001",
  "STYLE-PROFILE-SEMANTIC-001",
  "STYLE-PROFILE-CAPABILITY-001",
  "COLAB-ENV-001",
  "COLAB-SYNC-001",
  "COLAB-RESUME-001",
  "API-REQUEST-001",
  "API-NOTFOUND-001",
  "API-LOG-001"
] as const;

export type FrameworkErrorCode = (typeof FRAMEWORK_ERROR_CODES)[number];

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";

export type ErrorCategory =
  | "configuration"
  | "contract"
  | "event"
  | "validation"
  | "pipeline"
  | "provider"
  | "renderer"
  | "storage";

export interface FrameworkErrorDescriptor {
  readonly code: FrameworkErrorCode;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: string;
}
