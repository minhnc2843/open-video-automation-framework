export const JOB_STATUSES = [
  "queued",
  "validating",
  "preparing",
  "generating_assets",
  "rendering",
  "encoding",
  "validating_output",
  "completed",
  "failed",
  "cancelled",
  "paused",
  "recoverable"
] as const;

export const PIPELINE_STAGES = [
  "project_created",
  "script_imported",
  "validation",
  "timeline_build",
  "asset_resolution",
  "ai_generation",
  "voice_generation",
  "subtitle_build",
  "scene_render",
  "frame_capture",
  "ffmpeg_encode",
  "audio_mix",
  "video_export",
  "output_validation"
] as const;

export const DOMAIN_EVENT_NAMES = [
  "job.status_changed",
  "pipeline.stage_started",
  "pipeline.stage_completed",
  "pipeline.stage_failed"
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type DomainEventName = (typeof DOMAIN_EVENT_NAMES)[number];

export interface DomainEventMetadata {
  readonly jobId?: string;
  readonly projectId?: string;
  readonly projectVersionId?: string;
  readonly sceneId?: string;
  readonly stage?: PipelineStage;
}

export interface DomainEvent<TPayload extends object = Record<string, never>> {
  readonly name: DomainEventName;
  readonly occurredAt: string;
  readonly metadata: DomainEventMetadata;
  readonly payload: TPayload;
}
