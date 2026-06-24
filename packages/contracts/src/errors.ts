export const FRAMEWORK_ERROR_CODES = [
  "CONFIG-ENV-001",
  "CONFIG-ENV-002",
  "CONTRACT-001",
  "EVENT-001"
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
