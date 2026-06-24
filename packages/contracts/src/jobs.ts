import type { FrameworkErrorCode } from "./errors.js";
import type { JobStatus, PipelineStage } from "./events.js";
import type { JsonObject, RenderJobRecord } from "./persistence.js";

export interface JobTransition {
  readonly from: JobStatus;
  readonly to: JobStatus;
  readonly stage?: PipelineStage;
  readonly errorCode?: FrameworkErrorCode;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: JsonObject;
}

export interface JobTransitionResult {
  readonly ok: true;
  readonly transition: JobTransition;
}

export interface JobTransitionFailure {
  readonly ok: false;
  readonly code: FrameworkErrorCode;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
}

export type JobTransitionCheckResult = JobTransitionResult | JobTransitionFailure;

export interface JobRepositoryPort {
  readonly getRenderJob: (id: string) => RenderJobRecord | null;
  readonly updateRenderJobStatus: (
    id: string,
    status: JobStatus,
    now?: Date,
    options?: {
      readonly incrementRetryCount?: boolean;
      readonly startedAt?: string | null;
      readonly finishedAt?: string | null;
    }
  ) => RenderJobRecord;
}

export interface WorkerStageHandler {
  readonly stage: PipelineStage;
  readonly run: (job: RenderJobRecord) => Promise<void>;
}
