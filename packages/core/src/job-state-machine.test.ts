import { describe, expect, it } from "vitest";
import { assertJobTransition, canTransitionJob } from "./job-state-machine.js";

describe("job state machine", () => {
  it("allows expected forward transitions", () => {
    expect(canTransitionJob("queued", "validating")).toBe(true);
    expect(canTransitionJob("validating", "preparing")).toBe(true);
    expect(canTransitionJob("validating_output", "completed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    const result = assertJobTransition("queued", "completed");

    expect(result).toEqual({
      ok: false,
      code: "JOB-STATE-001",
      humanReadableMessage: "Job state transition is not allowed.",
      technicalDetails: "Cannot transition job from 'queued' to 'completed'."
    });
  });

  it("allows recoverable jobs to resume at a later pipeline stage", () => {
    expect(canTransitionJob("recoverable", "rendering")).toBe(true);
    expect(canTransitionJob("recoverable", "encoding")).toBe(true);
  });
});
