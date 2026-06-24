import type { JobStatus, JobTransitionCheckResult } from "@ovaf/contracts";

const ALLOWED_TRANSITIONS: ReadonlyMap<JobStatus, readonly JobStatus[]> = new Map([
  ["queued", ["validating", "cancelled"]],
  ["validating", ["preparing", "failed", "cancelled", "recoverable"]],
  ["preparing", ["generating_assets", "rendering", "failed", "cancelled", "recoverable"]],
  ["generating_assets", ["rendering", "failed", "cancelled", "recoverable"]],
  ["rendering", ["encoding", "failed", "cancelled", "recoverable"]],
  ["encoding", ["validating_output", "failed", "cancelled", "recoverable"]],
  ["validating_output", ["completed", "failed", "cancelled", "recoverable"]],
  ["recoverable", ["preparing", "generating_assets", "rendering", "encoding", "failed", "cancelled"]],
  ["paused", ["preparing", "cancelled"]],
  ["completed", []],
  ["failed", []],
  ["cancelled", []]
]);

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS.get(from)?.includes(to) ?? false;
}

export function assertJobTransition(from: JobStatus, to: JobStatus): JobTransitionCheckResult {
  if (!canTransitionJob(from, to)) {
    return {
      ok: false,
      code: "JOB-STATE-001",
      humanReadableMessage: "Job state transition is not allowed.",
      technicalDetails: `Cannot transition job from '${from}' to '${to}'.`
    };
  }

  return {
    ok: true,
    transition: {
      from,
      to,
      humanReadableMessage: `Job transitioned from ${from} to ${to}.`
    }
  };
}
