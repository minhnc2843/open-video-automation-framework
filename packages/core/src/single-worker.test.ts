import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JobRepositoryPort, JobStatus, RenderJobRecord, WorkerStageHandler } from "@ovaf/contracts";
import { JsonlLogger } from "@ovaf/logger";
import { SingleWorker } from "./single-worker.js";

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-worker-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("SingleWorker", () => {
  it("runs stage handlers and completes a job", async () => {
    const repository = new MemoryJobRepository(createJob());
    const logPath = path.join(tempRoot, "job.jsonl");
    const executed: string[] = [];
    const worker = new SingleWorker({
      repository,
      logger: new JsonlLogger({ logPath }),
      handlers: createHandlers((stage) => {
        executed.push(stage);
      }),
      now: () => new Date("2026-06-24T00:00:00.000Z")
    });

    const finalJob = await worker.runJob("job-1");

    expect(finalJob.status).toBe("completed");
    expect(finalJob.startedAt).toBe("2026-06-24T00:00:00.000Z");
    expect(finalJob.finishedAt).toBe("2026-06-24T00:00:00.000Z");
    expect(executed).toEqual([
      "validation",
      "timeline_build",
      "asset_resolution",
      "scene_render",
      "ffmpeg_encode",
      "output_validation"
    ]);
    expect(readFileSync(logPath, "utf8")).toContain("pipeline.stage_completed");
  });

  it("marks failed stage as recoverable and increments retry count", async () => {
    const repository = new MemoryJobRepository(createJob());
    const worker = new SingleWorker({
      repository,
      logger: new JsonlLogger({ logPath: path.join(tempRoot, "job.jsonl") }),
      handlers: createHandlers((stage) => {
        if (stage === "timeline_build") {
          throw new Error("timeline failure");
        }
      }),
      now: () => new Date("2026-06-24T00:00:00.000Z")
    });

    const finalJob = await worker.runJob("job-1");

    expect(finalJob.status).toBe("recoverable");
    expect(finalJob.retryCount).toBe(1);
  });
});

function createHandlers(run: (stage: WorkerStageHandler["stage"]) => void): readonly WorkerStageHandler[] {
  return [
    {
      stage: "validation",
      run: async () => run("validation")
    },
    {
      stage: "timeline_build",
      run: async () => run("timeline_build")
    },
    {
      stage: "asset_resolution",
      run: async () => run("asset_resolution")
    },
    {
      stage: "scene_render",
      run: async () => run("scene_render")
    },
    {
      stage: "ffmpeg_encode",
      run: async () => run("ffmpeg_encode")
    },
    {
      stage: "output_validation",
      run: async () => run("output_validation")
    }
  ];
}

function createJob(): RenderJobRecord {
  return {
    id: "job-1",
    projectId: "project-1",
    projectVersionId: "version-1",
    status: "queued",
    configSnapshot: {},
    providerSnapshot: null,
    renderEnvironment: null,
    logPath: null,
    outputPath: null,
    retryCount: 0,
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
    startedAt: null,
    finishedAt: null
  };
}

class MemoryJobRepository implements JobRepositoryPort {
  private job: RenderJobRecord;

  constructor(job: RenderJobRecord) {
    this.job = job;
  }

  getRenderJob(id: string): RenderJobRecord | null {
    return this.job.id === id ? this.job : null;
  }

  updateRenderJobStatus(
    id: string,
    status: JobStatus,
    now: Date = new Date(),
    options: {
      readonly incrementRetryCount?: boolean;
      readonly startedAt?: string | null;
      readonly finishedAt?: string | null;
    } = {}
  ): RenderJobRecord {
    if (this.job.id !== id) {
      throw new Error("job not found");
    }

    this.job = {
      ...this.job,
      status,
      retryCount: this.job.retryCount + (options.incrementRetryCount === true ? 1 : 0),
      updatedAt: now.toISOString(),
      startedAt: options.startedAt === undefined ? this.job.startedAt : options.startedAt,
      finishedAt: options.finishedAt === undefined ? this.job.finishedAt : options.finishedAt
    };

    return this.job;
  }
}
