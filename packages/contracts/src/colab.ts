import type { JobStatus, PipelineStage } from "./events.js";

export const COLAB_ENVIRONMENT_CHECKS = [
  "node",
  "npm",
  "ffmpeg",
  "ffprobe",
  "chromium",
  "storage_root",
  "google_drive_mount"
] as const;

export type ColabEnvironmentCheckName = (typeof COLAB_ENVIRONMENT_CHECKS)[number];
export type ColabRuntimeKind = "google_colab" | "local_colab_compatible";
export type ColabSyncDirection = "to_colab" | "from_colab";
export type ColabSyncFileKind = "database" | "project" | "asset" | "cache" | "log" | "output" | "manifest";
export type ColabResumeAction = "start" | "resume" | "complete" | "blocked";

export interface ColabEnvironmentCheckResult {
  readonly name: ColabEnvironmentCheckName;
  readonly ok: boolean;
  readonly required: boolean;
  readonly humanReadableMessage: string;
  readonly technicalDetails?: string;
}

export interface ColabEnvironmentReport {
  readonly ok: boolean;
  readonly runtime: ColabRuntimeKind;
  readonly checkedAt: string;
  readonly storageRoot: string;
  readonly checks: readonly ColabEnvironmentCheckResult[];
}

export interface ColabSyncFileEntry {
  readonly kind: ColabSyncFileKind;
  readonly path: string;
  readonly required: boolean;
  readonly checksumSha256?: string;
  readonly sizeBytes?: number;
}

export interface ColabSyncManifest {
  readonly version: "1.0";
  readonly id: string;
  readonly createdAt: string;
  readonly direction: ColabSyncDirection;
  readonly sourceRoot: string;
  readonly targetRoot: string;
  readonly projectId?: string;
  readonly projectVersionId?: string;
  readonly jobId?: string;
  readonly files: readonly ColabSyncFileEntry[];
}

export interface ColabSyncManifestIssue {
  readonly code: "COLAB-SYNC-001";
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
}

export interface ColabResumePlan {
  readonly action: ColabResumeAction;
  readonly jobId: string;
  readonly currentStatus: JobStatus;
  readonly startStage?: PipelineStage;
  readonly missingArtifacts: readonly string[];
  readonly humanReadableMessage: string;
}
