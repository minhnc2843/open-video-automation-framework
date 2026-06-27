import { readFileSync } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildRenderJobPaths, canTransitionJob, runRenderJob, type RenderJobProgress, type RenderJobResult } from "@ovaf/core";
import type {
  CreateRenderJobFromScriptResponseData,
  JsonObject,
  JsonScript,
  JobStatus,
  RenderJobErrorData,
  RenderJobOutputData,
  RenderJobProgressData,
  RenderJobRecord,
  RenderJobStatusResponseData,
  StructuredLogRecord
} from "@ovaf/contracts";
import type { ApiProjectRepository } from "./repositories.js";

const FINAL_STATUSES: readonly JobStatus[] = ["completed", "failed", "cancelled"];

export interface RenderJobServiceOptions {
  readonly repository: ApiProjectRepository;
  readonly storageRoot: string;
  readonly startBackgroundTask?: (work: () => Promise<void>) => void;
  readonly chromiumExecutablePath?: string;
  readonly ffmpegPath?: string;
  readonly ffprobePath?: string;
  readonly now?: () => Date;
}

export interface CreateAndStartRenderJobInput {
  readonly projectId: string;
  readonly script: JsonScript;
}

export class RenderJobService {
  private readonly repository: ApiProjectRepository;
  private readonly storageRoot: string;
  private readonly startBackgroundTask: (work: () => Promise<void>) => void;
  private readonly chromiumExecutablePath: string | undefined;
  private readonly ffmpegPath: string | undefined;
  private readonly ffprobePath: string | undefined;
  private readonly now: () => Date;
  private readonly progressByJobId = new Map<string, RenderJobProgressData>();
  private readonly errorByJobId = new Map<string, RenderJobErrorData>();
  private readonly outputByJobId = new Map<string, RenderJobOutputData>();
  private readonly runningProjectVersionIds = new Set<string>();

  constructor(options: RenderJobServiceOptions) {
    this.repository = options.repository;
    this.storageRoot = options.storageRoot;
    this.chromiumExecutablePath = options.chromiumExecutablePath;
    this.ffmpegPath = options.ffmpegPath;
    this.ffprobePath = options.ffprobePath;
    this.startBackgroundTask =
      options.startBackgroundTask ??
      ((work) => {
        setTimeout(() => {
          void work();
        }, 0);
      });
    this.now = options.now ?? (() => new Date());
  }

  createAndStartRenderJob(input: CreateAndStartRenderJobInput): CreateRenderJobFromScriptResponseData {
    const project = this.repository.getProject(input.projectId);
    if (project === null) {
      throw new RenderJobServiceError("API-NOTFOUND-001", "Project was not found.");
    }

    const versionId = createId("version");
    const jobId = createId("job");
    const paths = buildRenderJobPaths({
      jobId,
      storageRoot: this.storageRoot
    });
    const version = this.repository.createProjectVersion({
      id: versionId,
      projectId: input.projectId,
      scriptSnapshot: toJsonObject(input.script),
      settingsSnapshot: toJsonObject(input.script.settings),
      styleProfileSnapshot: null
    });

    if (this.runningProjectVersionIds.has(version.id)) {
      throw new RenderJobServiceError("JOB-STATE-001", "A render job is already running for this project version.");
    }

    const job = this.repository.createRenderJob({
      id: jobId,
      projectId: input.projectId,
      projectVersionId: version.id,
      configSnapshot: {
        mode: "web-render",
        source: "apps/api"
      },
      logPath: paths.logPath,
      outputPath: paths.outputPath,
      providerSnapshot: null,
      renderEnvironment: {
        runner: "in-process-local"
      }
    });

    this.progressByJobId.set(job.id, {
      completedScenes: 0,
      currentStage: "queued",
      percent: 0,
      totalScenes: 0
    });
    this.startBackgroundTask(async () => {
      try {
        await this.runBackgroundJob(job, input.script);
      } catch (error) {
        this.errorByJobId.set(job.id, {
          code: "RENDERER-CAPTURE-001",
          message: "Render job failed before producing a valid MP4.",
          technicalDetails: toJsonObject({
            details: error instanceof Error ? error.message : String(error)
          })
        });
        this.transitionJob(job.id, "failed", { finishedAt: this.now().toISOString() });
        this.runningProjectVersionIds.delete(job.projectVersionId);
      }
    });

    return {
      createdAt: job.createdAt,
      jobId: job.id,
      projectId: job.projectId,
      status: "queued"
    };
  }

  async runBackgroundJob(job: RenderJobRecord, script: JsonScript): Promise<void> {
    const currentJob = this.repository.getRenderJob(job.id);
    if (currentJob === null || currentJob.status !== "queued") {
      return;
    }

    this.runningProjectVersionIds.add(job.projectVersionId);

    const result = await runRenderJob({
      jobId: job.id,
      projectId: job.projectId,
      projectVersionId: job.projectVersionId,
      script,
      storageRoot: this.storageRoot,
      ...(this.chromiumExecutablePath === undefined ? {} : { chromiumExecutablePath: this.chromiumExecutablePath }),
      ...(this.ffmpegPath === undefined ? {} : { ffmpegPath: this.ffmpegPath }),
      ...(this.ffprobePath === undefined ? {} : { ffprobePath: this.ffprobePath }),
      onProgress: async (progress) => {
        this.progressByJobId.set(job.id, toProgressData(progress));
        this.transitionJob(job.id, progress.status);
      }
    });

    this.runningProjectVersionIds.delete(job.projectVersionId);
    if (result.ok) {
      this.outputByJobId.set(job.id, toOutputData(job.id, result));
      this.progressByJobId.set(job.id, {
        completedScenes: this.progressByJobId.get(job.id)?.totalScenes ?? 0,
        currentStage: "completed",
        percent: 100,
        totalScenes: this.progressByJobId.get(job.id)?.totalScenes ?? 0
      });
      this.transitionJob(job.id, "completed", { finishedAt: this.now().toISOString() });
      return;
    }

    this.errorByJobId.set(job.id, toErrorData(result.error));
    this.transitionJob(job.id, "failed", { finishedAt: this.now().toISOString() });
  }

  getStatus(jobId: string): RenderJobStatusResponseData | null {
    const job = this.repository.getRenderJob(jobId);
    if (job === null) {
      return null;
    }

    return {
      error: this.errorByJobId.get(job.id) ?? null,
      jobId: job.id,
      output: job.status === "completed" ? this.outputByJobId.get(job.id) ?? this.readOutputFromLogs(job) : null,
      progress: this.progressByJobId.get(job.id) ?? progressFromStatus(job.status),
      projectId: job.projectId,
      status: job.status
    };
  }

  async cancel(jobId: string): Promise<{ readonly jobId: string; readonly status: JobStatus; readonly warning?: { readonly code: string; readonly message: string } } | null> {
    const job = this.repository.getRenderJob(jobId);
    if (job === null) {
      return null;
    }

    if (job.status === "queued") {
      const cancelled = this.repository.updateRenderJobStatus(job.id, "cancelled", this.now(), {
        finishedAt: this.now().toISOString()
      });
      this.progressByJobId.set(job.id, {
        completedScenes: 0,
        currentStage: "cancelled",
        percent: 0,
        totalScenes: 0
      });
      return {
        jobId: cancelled.id,
        status: cancelled.status
      };
    }

    if (FINAL_STATUSES.includes(job.status)) {
      return {
        jobId: job.id,
        status: job.status
      };
    }

    return {
      jobId: job.id,
      status: job.status,
      warning: {
        code: "JOB-CANCEL-UNSUPPORTED",
        message: "This V1 local runner cannot safely kill an active render process yet."
      }
    };
  }

  private transitionJob(
    jobId: string,
    targetStatus: JobStatus,
    options: {
      readonly finishedAt?: string | null;
    } = {}
  ): RenderJobRecord | null {
    const current = this.repository.getRenderJob(jobId);
    if (current === null || current.status === targetStatus) {
      return current;
    }

    if (!canTransitionJob(current.status, targetStatus)) {
      return current;
    }

    return this.repository.updateRenderJobStatus(jobId, targetStatus, this.now(), {
      ...(targetStatus === "validating" && current.startedAt === null ? { startedAt: this.now().toISOString() } : {}),
      ...(options.finishedAt === undefined ? {} : { finishedAt: options.finishedAt })
    });
  }

  private readOutputFromLogs(job: RenderJobRecord): RenderJobOutputData | null {
    if (job.logPath === null) {
      return null;
    }

    try {
      const raw = readFileSync(job.logPath, "utf8");
      const logs = parseStructuredLogs(raw);
      const completedLog = [...logs].reverse().find((record) => record.status === "completed" && record.stage === "output_validation");
      const metadata = completedLog?.technicalDetails?.metadata;
      if (!isJsonObject(metadata)) {
        return null;
      }

      const durationSeconds = readNumber(metadata.durationSeconds);
      const fps = readNumber(metadata.fps);
      const width = readNumber(metadata.width);
      const height = readNumber(metadata.height);
      if (durationSeconds === null || fps === null || width === null || height === null) {
        return null;
      }

      return {
        durationSeconds,
        fileName: job.outputPath === null ? `${job.id}.mp4` : path.basename(job.outputPath),
        fps,
        height,
        videoUrl: `/api/render-jobs/${encodeURIComponent(job.id)}/output`,
        width
      };
    } catch {
      return null;
    }
  }
}

export class RenderJobServiceError extends Error {
  readonly code: "API-NOTFOUND-001" | "JOB-STATE-001";

  constructor(code: "API-NOTFOUND-001" | "JOB-STATE-001", message: string) {
    super(message);
    this.name = "RenderJobServiceError";
    this.code = code;
  }
}

export async function outputExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function parseStructuredLogs(rawLogs: string): readonly StructuredLogRecord[] {
  return rawLogs
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as unknown;
        return isStructuredLogRecord(parsed) ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

function toProgressData(progress: RenderJobProgress): RenderJobProgressData {
  return {
    completedScenes: progress.completedScenes,
    currentStage: progress.currentStage,
    percent: progress.percent,
    ...(progress.sceneId === undefined ? {} : { sceneId: progress.sceneId }),
    ...(progress.sceneIndex === undefined ? {} : { sceneIndex: progress.sceneIndex }),
    totalScenes: progress.totalScenes
  };
}

function toOutputData(jobId: string, result: Extract<RenderJobResult, { readonly ok: true }>): RenderJobOutputData {
  return {
    durationSeconds: result.metadata.durationSeconds,
    fileName: path.basename(result.outputPath),
    fps: result.metadata.fps,
    height: result.metadata.height,
    videoUrl: `/api/render-jobs/${encodeURIComponent(jobId)}/output`,
    width: result.metadata.width
  };
}

function toErrorData(error: Extract<RenderJobResult, { readonly ok: false }>["error"]): RenderJobErrorData {
  return {
    code: error.code,
    message: error.message,
    technicalDetails: toJsonObject({
      details: normalizeTechnicalDetails(error.technicalDetails)
    })
  };
}

function normalizeTechnicalDetails(value: unknown): string {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function progressFromStatus(status: JobStatus): RenderJobProgressData {
  if (status === "completed") {
    return {
      completedScenes: 0,
      currentStage: "completed",
      percent: 100,
      totalScenes: 0
    };
  }

  if (status === "failed" || status === "cancelled") {
    return {
      completedScenes: 0,
      currentStage: status,
      percent: 0,
      totalScenes: 0
    };
  }

  return {
    completedScenes: 0,
    currentStage: status,
    percent: 0,
    totalScenes: 0
  };
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function createId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function isStructuredLogRecord(value: unknown): value is StructuredLogRecord {
  return (
    isJsonObject(value) &&
    typeof value.timestamp === "string" &&
    isLogLevel(value.level) &&
    typeof value.humanReadableMessage === "string"
  );
}

function isLogLevel(value: unknown): value is StructuredLogRecord["level"] {
  return value === "debug" || value === "info" || value === "warn" || value === "error";
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
