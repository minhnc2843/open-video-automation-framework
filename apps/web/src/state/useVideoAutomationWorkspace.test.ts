import { describe, expect, it } from "vitest";
import { isFinalRenderJobStatus, shouldPollRenderJobStatus } from "./useVideoAutomationWorkspace";

describe("render job polling helpers", () => {
  it("polls only non-final render job statuses", () => {
    expect(shouldPollRenderJobStatus("queued")).toBe(true);
    expect(shouldPollRenderJobStatus("rendering")).toBe(true);
    expect(shouldPollRenderJobStatus("validating_output")).toBe(true);

    expect(shouldPollRenderJobStatus("completed")).toBe(false);
    expect(shouldPollRenderJobStatus("failed")).toBe(false);
    expect(shouldPollRenderJobStatus("cancelled")).toBe(false);
  });

  it("treats completed, failed and cancelled as final", () => {
    expect(isFinalRenderJobStatus("completed")).toBe(true);
    expect(isFinalRenderJobStatus("failed")).toBe(true);
    expect(isFinalRenderJobStatus("cancelled")).toBe(true);
    expect(isFinalRenderJobStatus("encoding")).toBe(false);
  });
});
