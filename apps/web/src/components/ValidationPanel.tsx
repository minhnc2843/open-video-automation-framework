import type { ReactElement } from "react";
import type { ValidationSummary } from "../state/useVideoAutomationWorkspace";

export interface ValidationPanelProps {
  readonly validation: ValidationSummary | null;
}

export function ValidationPanel(props: ValidationPanelProps): ReactElement {
  if (props.validation === null) {
    return (
      <section className="rounded-lg border border-neutral-300 bg-white p-4">
        <h2 className="text-lg font-semibold text-neutral-950">Validation</h2>
        <p className="mt-3 text-sm text-neutral-600">Run validation to see schema and semantic issues from the API.</p>
      </section>
    );
  }

  if (props.validation.valid) {
    return (
      <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <h2 className="text-lg font-semibold text-emerald-950">Validation passed</h2>
        <p className="mt-2 text-sm text-emerald-900">The current JSON Script is ready to save as a version.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-amber-950">Validation issues</h2>
        <span className="rounded-md bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-950">
          {props.validation.issues.length}
        </span>
      </div>
      <div className="space-y-3">
        {props.validation.issues.map((issue, index) => (
          <div className="rounded-md border border-amber-300 bg-white p-3" key={`${issue.code}-${issue.path}-${index}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-neutral-900 px-2 py-1 font-mono text-xs text-white">{issue.code}</span>
              <span className="font-mono text-xs text-neutral-700">{issue.path}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-neutral-950">{issue.humanReadableMessage}</p>
            <p className="mt-1 break-words font-mono text-xs text-neutral-600">{issue.technicalDetails}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
