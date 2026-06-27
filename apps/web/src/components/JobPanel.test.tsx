import { renderToStaticMarkup } from "react-dom/server";
import type { RenderJobStatusResponseData, StructuredLogRecord } from "@ovaf/contracts";
import { describe, expect, it } from "vitest";
import { JobPanel } from "./JobPanel";

const noop = (): void => undefined;

describe("JobPanel", () => {
  it("renders an empty render state", () => {
    const html = renderPanel(null);

    expect(html).toContain("Chưa có video render.");
  });

  it("renders active render progress without offering fake active cancellation", () => {
    const html = renderPanel({
      error: null,
      jobId: "job-1",
      output: null,
      progress: {
        completedScenes: 1,
        currentStage: "rendering_scene_2_of_3",
        percent: 45,
        totalScenes: 3
      },
      projectId: "project-1",
      status: "rendering"
    });

    expect(html).toContain("rendering_scene_2_of_3");
    expect(html).toContain("1 / 3");
    expect(html).toContain("45%");
    expect(html).toContain("Active render cancellation is not supported in V1.");
  });

  it("renders completed MP4 preview and download URL", () => {
    const html = renderPanel({
      error: null,
      jobId: "job-1",
      output: {
        durationSeconds: 1,
        fileName: "job-1.mp4",
        fps: 1,
        height: 1920,
        videoUrl: "/api/render-jobs/job-1/output",
        width: 1080
      },
      progress: {
        completedScenes: 1,
        currentStage: "completed",
        percent: 100,
        totalScenes: 1
      },
      projectId: "project-1",
      status: "completed"
    });

    expect(html).toContain("src=\"http://localhost:3000/api/render-jobs/job-1/output\"");
    expect(html).toContain("Tải MP4");
    expect(html).toContain("1080x1920");
  });

  it("renders failed job error and structured logs", () => {
    const logs: readonly StructuredLogRecord[] = [
      {
        humanReadableMessage: "Render failed.",
        jobId: "job-1",
        level: "error",
        stage: "frame_capture",
        status: "failed",
        timestamp: "2026-06-27T00:00:00.000Z"
      }
    ];
    const html = renderPanel(
      {
        error: {
          code: "RENDERER-CAPTURE-001",
          message: "Render job failed before producing a valid MP4.",
          technicalDetails: {
            details: "Chromium executable missing."
          }
        },
        jobId: "job-1",
        output: null,
        progress: {
          completedScenes: 0,
          currentStage: "failed",
          percent: 0,
          totalScenes: 1
        },
        projectId: "project-1",
        status: "failed"
      },
      logs
    );

    expect(html).toContain("RENDERER-CAPTURE-001");
    expect(html).toContain("Render job failed before producing a valid MP4.");
    expect(html).toContain("Render failed.");
  });
});

function renderPanel(
  job: RenderJobStatusResponseData | null,
  logs: readonly StructuredLogRecord[] = []
): string {
  return renderToStaticMarkup(
    <JobPanel
      apiBaseUrl="http://localhost:3000"
      busyAction={null}
      job={job}
      logs={logs}
      onCancelJob={noop}
      onLoadLogs={noop}
      onRefreshJob={noop}
    />
  );
}
