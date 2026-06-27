import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import type {
  ApiResponse,
  CancelRenderJobResponseData,
  CreateRenderJobFromScriptResponseData,
  GetJobLogsResponseData,
  JsonScript,
  JobStatus,
  RenderJobStatusResponseData
} from "@ovaf/contracts";
import { SqliteProjectRepository } from "@ovaf/persistence";
import { buildApiApp } from "../../apps/api/src/app.js";
import { RenderJobService } from "../../apps/api/src/render-job-service.js";

interface Harness {
  readonly app: FastifyInstance;
  readonly repository: SqliteProjectRepository;
  readonly storageRoot: string;
  readonly tempRoot: string;
}

describe("render job API integration", () => {
  it("creates a real render job and serves the completed MP4", async () => {
    const harness = createHarness();

    try {
      await seedProject(harness.app);

      const createResponse = await harness.app.inject({
        method: "POST",
        payload: {
          script: SHORT_RENDER_SCRIPT
        },
        url: "/api/projects/project-1/render-jobs"
      });
      expect(createResponse.statusCode).toBe(201);
      const created = unwrap<CreateRenderJobFromScriptResponseData>(createResponse.json());
      expect(created.status).toBe("queued");

      const completed = await waitForFinalJobStatus(harness.app, created.jobId);
      expect(completed.status).toBe("completed");
      expect(completed.progress.percent).toBe(100);
      expect(completed.output).toMatchObject({
        fps: 1,
        height: 1920,
        width: 1080
      });
      expect(completed.output?.videoUrl).toBe(`/api/render-jobs/${encodeURIComponent(created.jobId)}/output`);

      const outputPath = path.join(harness.storageRoot, "output", `${created.jobId}.mp4`);
      expect(statSync(outputPath).size).toBeGreaterThan(0);

      const outputResponse = await harness.app.inject({
        method: "GET",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}/output`
      });
      expect(outputResponse.statusCode).toBe(200);
      expect(outputResponse.headers["content-type"]).toBe("video/mp4");
      expect(Number(outputResponse.headers["content-length"])).toBeGreaterThan(0);

      const logsResponse = await harness.app.inject({
        method: "GET",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}/logs`
      });
      expect(logsResponse.statusCode).toBe(200);
      const logs = unwrap<GetJobLogsResponseData>(logsResponse.json());
      expect(logs.lines.length).toBeGreaterThan(0);
      expect(logs.logs.some((record) => record.stage === "output_validation" && record.status === "completed")).toBe(true);
    } finally {
      await disposeHarness(harness);
    }
  }, 120000);

  it("returns validation issues before creating a render job", async () => {
    const harness = createHarness({
      startBackgroundTask: () => undefined
    });

    try {
      await seedProject(harness.app);

      const response = await harness.app.inject({
        method: "POST",
        payload: {
          script: {
            version: "1.0"
          }
        },
        url: "/api/projects/project-1/render-jobs"
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        ok: false,
        error: {
          code: "SCRIPT-SCHEMA-001",
          validationIssues: expect.any(Array)
        }
      });
    } finally {
      await disposeHarness(harness);
    }
  });

  it("keeps output unavailable before completion and supports queued cancellation", async () => {
    const harness = createHarness({
      startBackgroundTask: () => undefined
    });

    try {
      await seedProject(harness.app);

      const createResponse = await harness.app.inject({
        method: "POST",
        payload: {
          script: SHORT_RENDER_SCRIPT
        },
        url: "/api/projects/project-1/render-jobs"
      });
      expect(createResponse.statusCode).toBe(201);
      const created = unwrap<CreateRenderJobFromScriptResponseData>(createResponse.json());

      const outputBeforeCompletion = await harness.app.inject({
        method: "GET",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}/output`
      });
      expect(outputBeforeCompletion.statusCode).toBe(409);

      const cancelResponse = await harness.app.inject({
        method: "POST",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}/cancel`
      });
      expect(cancelResponse.statusCode).toBe(200);
      const cancelled = unwrap<CancelRenderJobResponseData>(cancelResponse.json());
      expect(cancelled.status).toBe("cancelled");

      const statusResponse = await harness.app.inject({
        method: "GET",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}`
      });
      expect(unwrap<RenderJobStatusResponseData>(statusResponse.json()).status).toBe("cancelled");
    } finally {
      await disposeHarness(harness);
    }
  });

  it("marks real runner failures as failed jobs instead of serving output", async () => {
    const harness = createHarness({
      chromiumExecutablePath: path.join(tmpdir(), "missing-ovaf-chromium.exe")
    });

    try {
      await seedProject(harness.app);

      const createResponse = await harness.app.inject({
        method: "POST",
        payload: {
          script: SHORT_RENDER_SCRIPT
        },
        url: "/api/projects/project-1/render-jobs"
      });
      expect(createResponse.statusCode).toBe(201);
      const created = unwrap<CreateRenderJobFromScriptResponseData>(createResponse.json());

      const failed = await waitForFinalJobStatus(harness.app, created.jobId);
      expect(failed.status).toBe("failed");
      expect(failed.error?.code).toBe("RENDERER-CAPTURE-001");
      expect(failed.output).toBeNull();

      const outputResponse = await harness.app.inject({
        method: "GET",
        url: `/api/render-jobs/${encodeURIComponent(created.jobId)}/output`
      });
      expect(outputResponse.statusCode).toBe(409);
    } finally {
      await disposeHarness(harness);
    }
  }, 60000);
});

function createHarness(options: {
  readonly chromiumExecutablePath?: string;
  readonly startBackgroundTask?: (work: () => Promise<void>) => void;
} = {}): Harness {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-render-job-api-"));
  const storageRoot = path.join(tempRoot, "storage");
  const repository = SqliteProjectRepository.open({
    databasePath: path.join(tempRoot, "api.sqlite")
  });
  const renderJobService = new RenderJobService({
    repository,
    storageRoot,
    ...(options.chromiumExecutablePath === undefined ? {} : { chromiumExecutablePath: options.chromiumExecutablePath }),
    ...(options.startBackgroundTask === undefined ? {} : { startBackgroundTask: options.startBackgroundTask })
  });
  const app = buildApiApp({
    renderJobService,
    repository,
    storageRoot
  });

  return {
    app,
    repository,
    storageRoot,
    tempRoot
  };
}

async function disposeHarness(harness: Harness): Promise<void> {
  await harness.app.close();
  harness.repository.close();
  rmSync(harness.tempRoot, {
    force: true,
    recursive: true
  });
}

async function seedProject(app: FastifyInstance): Promise<void> {
  const workspaceResponse = await app.inject({
    method: "POST",
    payload: {
      id: "workspace-1",
      name: "Default Workspace"
    },
    url: "/workspaces"
  });
  expect(workspaceResponse.statusCode).toBe(201);

  const projectResponse = await app.inject({
    method: "POST",
    payload: {
      id: "project-1",
      language: "en",
      name: "API render test",
      workspaceId: "workspace-1"
    },
    url: "/projects"
  });
  expect(projectResponse.statusCode).toBe(201);
}

async function waitForFinalJobStatus(
  app: FastifyInstance,
  jobId: string,
  timeoutMs = 90000
): Promise<RenderJobStatusResponseData> {
  const deadline = Date.now() + timeoutMs;
  let latest: RenderJobStatusResponseData | null = null;

  while (Date.now() < deadline) {
    const response = await app.inject({
      method: "GET",
      url: `/api/render-jobs/${encodeURIComponent(jobId)}`
    });
    expect(response.statusCode).toBe(200);
    latest = unwrap<RenderJobStatusResponseData>(response.json());

    if (isFinalStatus(latest.status)) {
      return latest;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for render job ${jobId}; latest status was ${latest?.status ?? "unknown"}.`);
}

function unwrap<TData>(response: ApiResponse<TData>): TData {
  expect(response.ok).toBe(true);
  if (!response.ok) {
    throw new Error(response.error.humanReadableMessage);
  }

  return response.data;
}

function isFinalStatus(status: JobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const SHORT_RENDER_SCRIPT: JsonScript = {
  project: {
    language: "en",
    name: "One second API render"
  },
  scenes: [
    {
      durationSeconds: 1,
      id: "scene-001",
      layers: [
        {
          id: "bg-001",
          source: {
            kind: "color",
            value: "#0f766e"
          },
          type: "background"
        },
        {
          content: "API to MP4",
          id: "text-001",
          type: "text"
        }
      ]
    }
  ],
  settings: {
    aspectRatio: "9:16",
    fps: 1,
    height: 1920,
    maxDurationSeconds: 1,
    musicEnabled: false,
    subtitleEnabled: false,
    voiceEnabled: false,
    width: 1080
  },
  version: "1.0"
};
