import { useState, type ReactElement } from "react";
import type { JobStatus, RenderJobStatusResponseData, StructuredLogRecord } from "@ovaf/contracts";
import type { WorkspaceAction } from "../state/useVideoAutomationWorkspace";

const JOB_STEPS: readonly { readonly label: string; readonly statuses: readonly JobStatus[] }[] = [
  { label: "Queued", statuses: ["queued"] },
  { label: "Validate", statuses: ["validating"] },
  { label: "Prepare", statuses: ["preparing", "generating_assets"] },
  { label: "Render", statuses: ["rendering"] },
  { label: "Encode", statuses: ["encoding"] },
  { label: "Validate output", statuses: ["validating_output"] },
  { label: "Complete", statuses: ["completed"] }
];

export interface JobPanelProps {
  readonly apiBaseUrl: string;
  readonly busyAction: WorkspaceAction | null;
  readonly job: RenderJobStatusResponseData | null;
  readonly logs: readonly StructuredLogRecord[];
  readonly onCancelJob: () => void;
  readonly onLoadLogs: () => void;
  readonly onRefreshJob: () => void;
}

export function JobPanel(props: JobPanelProps): ReactElement {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const job = props.job;
  const outputUrl =
    job?.output === null || job?.output === undefined
      ? null
      : toAbsoluteApiUrl(props.apiBaseUrl, job.output.videoUrl);

  return (
    <section className="rounded-lg border border-neutral-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Render video</p>
          <h2 className="text-lg font-semibold text-neutral-950">
            {job === null ? "Chưa có video render." : job.status}
          </h2>
        </div>
        <div className="flex gap-2">
          {job?.status === "queued" ? (
            <button
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:text-neutral-500"
              disabled={props.busyAction === "cancel-job"}
              onClick={props.onCancelJob}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          <button
            className="rounded-md border border-neutral-400 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={job === null || props.busyAction === "refresh-job"}
            onClick={props.onRefreshJob}
            type="button"
          >
            Refresh
          </button>
          <button
            className="rounded-md border border-neutral-400 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={job === null || props.busyAction === "load-logs"}
            onClick={props.onLoadLogs}
            type="button"
          >
            Logs
          </button>
        </div>
      </div>

      {job === null ? (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-600">
          Chưa có video render.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Job ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-800">{job.jobId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Stage</dt>
              <dd className="mt-1 text-neutral-900">{job.progress.currentStage}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Scene</dt>
              <dd className="mt-1 text-neutral-900">
                {job.progress.totalScenes > 0
                  ? `${job.progress.completedScenes} / ${job.progress.totalScenes}`
                  : "Not started"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Progress</dt>
              <dd className="mt-1 text-neutral-900">{job.progress.percent}%</dd>
            </div>
          </dl>

          <div className="mt-4 h-3 overflow-hidden rounded bg-neutral-200" aria-label="Render progress">
            <div
              className="h-full bg-emerald-600 transition-[width]"
              style={{ width: `${Math.max(0, Math.min(100, job.progress.percent))}%` }}
            />
          </div>

          {job.status !== "queued" && job.status !== "completed" && job.status !== "failed" && job.status !== "cancelled" ? (
            <p className="mt-3 text-xs text-neutral-600">Active render cancellation is not supported in V1.</p>
          ) : null}

          <div className="mt-5 space-y-2">
            {JOB_STEPS.map((step, index) => {
              const state = getStepState(job.status, index);
              return (
                <div className="flex items-center gap-3" key={step.label}>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      state === "done"
                        ? "bg-emerald-600"
                        : state === "active"
                          ? "bg-amber-500"
                          : state === "failed"
                            ? "bg-red-600"
                            : "bg-neutral-300"
                    }`}
                  />
                  <span className={state === "pending" ? "text-sm text-neutral-500" : "text-sm font-medium text-neutral-900"}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {job.output !== null && outputUrl !== null ? (
            <div className="mt-5 space-y-3">
              <video className="aspect-[9/16] max-h-[520px] w-full rounded-md bg-black" controls src={outputUrl} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Size</dt>
                    <dd className="mt-1 text-neutral-900">
                      {job.output.width}x{job.output.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">FPS</dt>
                    <dd className="mt-1 text-neutral-900">{job.output.fps}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Duration</dt>
                    <dd className="mt-1 text-neutral-900">{job.output.durationSeconds}s</dd>
                  </div>
                </dl>
                <a
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  download={job.output.fileName}
                  href={outputUrl}
                >
                  Tải MP4
                </a>
              </div>
            </div>
          ) : null}

          {job.error !== null ? (
            <div className="mt-5 rounded-md border border-red-300 bg-red-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-red-800 px-2 py-1 font-mono text-xs text-white">{job.error.code}</span>
                <p className="text-sm font-semibold text-red-950">{job.error.message}</p>
              </div>
              <button
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900"
                onClick={() => setDetailsOpen((open) => !open)}
                type="button"
              >
                Technical details
              </button>
              {detailsOpen ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded bg-white p-3 text-xs text-red-950">
                  {JSON.stringify(job.error.technicalDetails ?? {}, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-950">Structured logs</h3>
        {props.logs.length === 0 ? (
          <p className="mt-2 rounded-md bg-neutral-50 px-3 py-4 text-sm text-neutral-600">No log records loaded.</p>
        ) : (
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-950 p-3 text-xs leading-5 text-neutral-50">
            {props.logs.map((record) => JSON.stringify(record)).join("\n")}
          </pre>
        )}
      </div>
    </section>
  );
}

function getStepState(
  status: JobStatus,
  stepIndex: number
): "active" | "done" | "failed" | "pending" {
  if (status === "failed" || status === "cancelled") {
    return stepIndex <= Math.max(0, getActiveStepIndex(status)) ? "failed" : "pending";
  }

  if (status === "completed") {
    return "done";
  }

  const activeStepIndex = getActiveStepIndex(status);
  if (stepIndex < activeStepIndex) {
    return "done";
  }

  return stepIndex === activeStepIndex ? "active" : "pending";
}

function getActiveStepIndex(status: JobStatus): number {
  const index = JOB_STEPS.findIndex((step) => step.statuses.includes(status));
  return index === -1 ? 0 : index;
}

function toAbsoluteApiUrl(apiBaseUrl: string, route: string): string {
  const trimmedBase = apiBaseUrl.trim().replace(/\/+$/u, "");
  if (route.startsWith("http://") || route.startsWith("https://")) {
    return route;
  }

  return `${trimmedBase}${route.startsWith("/") ? route : `/${route}`}`;
}
