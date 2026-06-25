import type {
  ColabResumePlan,
  ColabSyncManifest,
  JobStatus,
  PipelineStage,
  RenderJobRecord
} from "@ovaf/contracts";

export interface BuildColabResumePlanInput {
  readonly job: RenderJobRecord;
  readonly manifest?: ColabSyncManifest;
  readonly availablePaths?: readonly string[];
}

export function buildColabResumePlan(input: BuildColabResumePlanInput): ColabResumePlan {
  const missingArtifacts = findMissingRequiredArtifacts(input.manifest, input.availablePaths ?? []);

  if (missingArtifacts.length > 0) {
    return {
      action: "blocked",
      currentStatus: input.job.status,
      humanReadableMessage: "Colab resume is blocked because required synchronized artifacts are missing.",
      jobId: input.job.id,
      missingArtifacts
    };
  }

  if (input.job.status === "completed") {
    return {
      action: "complete",
      currentStatus: input.job.status,
      humanReadableMessage: "Render job is already completed.",
      jobId: input.job.id,
      missingArtifacts: []
    };
  }

  if (input.job.status === "failed" || input.job.status === "cancelled") {
    return {
      action: "blocked",
      currentStatus: input.job.status,
      humanReadableMessage: "Render job cannot resume automatically from a final failure state.",
      jobId: input.job.id,
      missingArtifacts: []
    };
  }

  const startStage = stageForStatus(input.job.status);

  return {
    action: input.job.status === "queued" ? "start" : "resume",
    currentStatus: input.job.status,
    humanReadableMessage:
      input.job.status === "queued"
        ? "Render job can start in Colab."
        : `Render job can resume from ${startStage}.`,
    jobId: input.job.id,
    missingArtifacts: [],
    startStage
  };
}

function findMissingRequiredArtifacts(
  manifest: ColabSyncManifest | undefined,
  availablePaths: readonly string[]
): readonly string[] {
  if (manifest === undefined) {
    return [];
  }

  const available = new Set(availablePaths.map(normalizePath));
  return manifest.files
    .filter((file) => file.required)
    .map((file) => normalizePath(file.path))
    .filter((filePath) => !available.has(filePath));
}

function stageForStatus(status: JobStatus): PipelineStage {
  switch (status) {
    case "queued":
    case "validating":
      return "validation";
    case "preparing":
      return "asset_resolution";
    case "generating_assets":
      return "ai_generation";
    case "rendering":
      return "scene_render";
    case "encoding":
      return "ffmpeg_encode";
    case "validating_output":
      return "output_validation";
    case "paused":
    case "recoverable":
      return "asset_resolution";
    case "completed":
    case "failed":
    case "cancelled":
      return "validation";
  }
}

function normalizePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}
