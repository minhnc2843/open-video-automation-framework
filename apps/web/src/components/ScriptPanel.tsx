import type { ReactElement } from "react";
import type { ProjectRecord, ProjectVersionRecord } from "@ovaf/contracts";
import type { ValidationSummary, WorkspaceAction } from "../state/useVideoAutomationWorkspace";

export interface ScriptPanelProps {
  readonly busyAction: WorkspaceAction | null;
  readonly latestVersion: ProjectVersionRecord | null;
  readonly scriptText: string;
  readonly selectedProject: ProjectRecord | null;
  readonly validation: ValidationSummary | null;
  readonly onRenderVideo: () => void;
  readonly onSaveVersion: () => void;
  readonly onScriptTextChange: (scriptText: string) => void;
  readonly onValidateScript: () => void;
}

export function ScriptPanel(props: ScriptPanelProps): ReactElement {
  const isBusy = props.busyAction !== null;
  const canUseProject = props.selectedProject !== null;
  const validationLabel =
    props.validation === null ? "Not validated" : props.validation.valid ? "Valid" : `${props.validation.issues.length} issue(s)`;

  return (
    <section className="flex min-h-[720px] flex-col rounded-lg border border-neutral-300 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">JSON Script</p>
          <h2 className="text-lg font-semibold text-neutral-950">
            {props.selectedProject === null ? "No project selected" : props.selectedProject.name}
          </h2>
          <p className="mt-1 font-mono text-xs text-neutral-600">
            {props.latestVersion === null ? "No saved version" : `Version ${props.latestVersion.versionNumber}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={props.busyAction === "validate-script"}
            onClick={props.onValidateScript}
            type="button"
          >
            {props.busyAction === "validate-script" ? "Validating..." : "Validate"}
          </button>
          <button
            className="rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:text-neutral-500"
            disabled={!canUseProject || props.busyAction === "save-version"}
            onClick={props.onSaveVersion}
            type="button"
          >
            {props.busyAction === "save-version" ? "Saving..." : "Save version"}
          </button>
          <button
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-400"
            disabled={!canUseProject || props.busyAction === "render-video"}
            onClick={props.onRenderVideo}
            type="button"
          >
            {props.busyAction === "render-video" ? "Starting..." : "Render video"}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_180px]">
        <textarea
          className="min-h-[620px] resize-y border-0 bg-neutral-950 p-4 font-mono text-sm leading-6 text-neutral-50 outline-none"
          onChange={(event) => props.onScriptTextChange(event.target.value)}
          spellCheck={false}
          value={props.scriptText}
        />
        <div className="border-t border-neutral-200 bg-neutral-50 p-4 lg:border-l lg:border-t-0">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Selected project</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-800">
                {props.selectedProject === null ? "None" : props.selectedProject.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Validation</dt>
              <dd className={props.validation?.valid === false ? "mt-1 font-semibold text-amber-700" : "mt-1 text-neutral-900"}>
                {validationLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Editor state</dt>
              <dd className="mt-1 text-neutral-900">{isBusy ? "Working" : "Ready"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
