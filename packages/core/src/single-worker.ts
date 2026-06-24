import type {
  JobRepositoryPort,
  JobStatus,
  PipelineStage,
  RenderJobRecord,
  StructuredLogRecord,
  WorkerStageHandler
} from "@ovaf/contracts";
import { JsonlLogger } from "@ovaf/logger";
import { assertJobTransition } from "./job-state-machine.js";

const STAGE_STATUS_SEQUENCE: readonly JobStatus[] = [
  "validating",
  "preparing",
  "generating_assets",
  "rendering",
  "encoding",
  "validating_output"
];

export interface SingleWorkerOptions {
  readonly repository: JobRepositoryPort;
  readonly logger: JsonlLogger;
  readonly handlers: readonly WorkerStageHandler[];
  readonly now?: () => Date;
}

export class SingleWorker {
  private readonly repository: JobRepositoryPort;
  private readonly logger: JsonlLogger;
  private readonly handlers: ReadonlyMap<JobStatus, WorkerStageHandler>;
  private readonly now: () => Date;

  constructor(options: SingleWorkerOptions) {
    this.repository = options.repository;
    this.logger = options.logger;
    this.handlers = new Map(
      STAGE_STATUS_SEQUENCE.flatMap((status, index) => {
        const handler = options.handlers[index];
        return handler === undefined ? [] : [[status, handler] as const];
      })
    );
    this.now = options.now ?? (() => new Date());
  }

  async runJob(jobId: string): Promise<RenderJobRecord> {
    const job = this.repository.getRenderJob(jobId);
    if (job === null) {
      throw new Error("JOB-STATE-002: render job was not found.");
    }

    let current = job;

    for (const status of STAGE_STATUS_SEQUENCE) {
      const handler = this.handlers.get(status);
      if (handler === undefined) {
        continue;
      }

      current = this.transition(current, status);
      await this.writeLog(current, "info", "pipeline.stage_started", handler.stage, `Started ${handler.stage}.`);

      try {
        await handler.run(current);
      } catch (error) {
        const failed = this.transition(current, "recoverable", { incrementRetryCount: true });
        await this.writeLog(failed, "error", "pipeline.stage_failed", handler.stage, `Failed ${handler.stage}.`, {
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        return failed;
      }

      await this.writeLog(current, "info", "pipeline.stage_completed", handler.stage, `Completed ${handler.stage}.`);
    }

    return this.transition(current, "completed", { finishedAt: this.now().toISOString() });
  }

  private transition(
    job: RenderJobRecord,
    status: JobStatus,
    options: {
      readonly incrementRetryCount?: boolean;
      readonly finishedAt?: string | null;
    } = {}
  ): RenderJobRecord {
    const check = assertJobTransition(job.status, status);
    if (!check.ok) {
      throw new Error(`${check.code}: ${check.technicalDetails}`);
    }

    const updateOptions: {
      incrementRetryCount?: boolean;
      startedAt?: string | null;
      finishedAt?: string | null;
    } = {};
    if (options.incrementRetryCount !== undefined) {
      updateOptions.incrementRetryCount = options.incrementRetryCount;
    }
    if (status === "validating" && job.startedAt === null) {
      updateOptions.startedAt = this.now().toISOString();
    }
    if (options.finishedAt !== undefined) {
      updateOptions.finishedAt = options.finishedAt;
    }

    return this.repository.updateRenderJobStatus(job.id, status, this.now(), updateOptions);
  }

  private async writeLog(
    job: RenderJobRecord,
    level: StructuredLogRecord["level"],
    status: string,
    stage: PipelineStage,
    humanReadableMessage: string,
    technicalDetails?: StructuredLogRecord["technicalDetails"]
  ): Promise<void> {
    await this.logger.write({
      timestamp: this.now().toISOString(),
      level,
      jobId: job.id,
      projectId: job.projectId,
      projectVersionId: job.projectVersionId,
      stage,
      status,
      retryCount: job.retryCount,
      humanReadableMessage,
      ...(technicalDetails === undefined ? {} : { technicalDetails })
    });
  }
}
