import type { FrameworkErrorCode } from "./errors.js";
import type { PipelineStage } from "./events.js";
import type { JsonObject } from "./persistence.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogRecord {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly jobId?: string;
  readonly projectId?: string;
  readonly projectVersionId?: string;
  readonly stage?: PipelineStage;
  readonly sceneId?: string;
  readonly status?: string;
  readonly durationMs?: number;
  readonly retryCount?: number;
  readonly errorCode?: FrameworkErrorCode;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: JsonObject;
}
