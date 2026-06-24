import type { JobStatus, RenderJobRecord } from "@ovaf/contracts";
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
  readonly busyAction: WorkspaceAction | null;
  readonly job: RenderJobRecord | null;
  readonly logs: readonly string[];
  readonly onLoadLogs: () => void;
  readonly onRefreshJob: () => void;
}

export function JobPanel(props: JobPanelProps): JSX.Element {
  return (
    <section className="rounded-lg border border-neutral-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Render job</p>
          <h2 className="text-lg font-semibold text-neutral-950">
            {props.job === null ? "No job queued" : props.job.status}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-neutral-400 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={props.job === null || props.busyAction === "refresh-job"}
            onClick={props.onRefreshJob}
            type="button"
          >
            Refresh
          </button>
          <button
            className="rounded-md border border-neutral-400 px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={props.job === null || props.busyAction === "load-logs"}
            onClick={props.onLoadLogs}
            type="button"
          >
            Logs
          </button>
        </div>
      </div>

      {props.job === null ? (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-600">
          Queue a render job after saving a valid project version.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Job ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-800">{props.job.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Retry</dt>
              <dd className="mt-1 text-neutral-900">{props.job.retryCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Output</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-800">{props.job.outputPath ?? "Not attached"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Log path</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-800">{props.job.logPath ?? "Not attached"}</dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2">
            {JOB_STEPS.map((step, index) => {
              const state = getStepState(props.job?.status ?? "queued", index);
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
        </>
      )}

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-950">Log viewer</h3>
        {props.logs.length === 0 ? (
          <p className="mt-2 rounded-md bg-neutral-50 px-3 py-4 text-sm text-neutral-600">No log lines loaded.</p>
        ) : (
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-950 p-3 text-xs leading-5 text-neutral-50">
            {props.logs.join("\n")}
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
