import { describe, expect, it } from "vitest";
import type { JsonScript, Timeline } from "@ovaf/contracts";
import { buildTimeline, validateTimelineTiming } from "./timeline-builder.js";

const script: JsonScript = {
  version: "1.0",
  project: {
    name: "Example video",
    language: "en"
  },
  settings: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    maxDurationSeconds: 8,
    voiceEnabled: true,
    musicEnabled: false,
    subtitleEnabled: true
  },
  scenes: [
    {
      id: "scene-001",
      durationSeconds: 3,
      layers: [
        {
          id: "bg-001",
          type: "background",
          source: {
            kind: "color",
            value: "#000000"
          }
        },
        {
          id: "text-001",
          type: "text",
          content: "First"
        }
      ],
      voice: {
        text: "First voice"
      }
    },
    {
      id: "scene-002",
      durationSeconds: 5,
      layers: [
        {
          id: "text-002",
          type: "text",
          content: "Second"
        }
      ],
      voice: {
        text: "Second voice"
      }
    }
  ]
};

describe("buildTimeline", () => {
  it("builds sequential scene timing and frame boundaries", () => {
    const result = buildTimeline(script);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected timeline build to pass.");
    }

    expect(result.timeline.durationSeconds).toBe(8);
    expect(result.timeline.durationFrames).toBe(240);
    expect(result.timeline.scenes).toMatchObject([
      {
        id: "scene-001",
        index: 0,
        startSeconds: 0,
        endSeconds: 3,
        startFrame: 0,
        endFrameExclusive: 90,
        durationFrames: 90
      },
      {
        id: "scene-002",
        index: 1,
        startSeconds: 3,
        endSeconds: 8,
        startFrame: 90,
        endFrameExclusive: 240,
        durationFrames: 150
      }
    ]);
  });

  it("preserves layer order as deterministic zIndex values", () => {
    const result = buildTimeline(script);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected timeline build to pass.");
    }

    expect(result.timeline.scenes[0]?.layers.map((layer) => [layer.id, layer.zIndex])).toEqual([
      ["bg-001", 0],
      ["text-001", 1]
    ]);
  });

  it("derives voice and subtitle cues per scene", () => {
    const result = buildTimeline(script);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected timeline build to pass.");
    }

    expect(result.timeline.scenes[0]?.voiceCue).toMatchObject({
      sceneId: "scene-001",
      startSeconds: 0,
      endSeconds: 3,
      text: "First voice"
    });
    expect(result.timeline.scenes[1]?.subtitleCue).toMatchObject({
      sceneId: "scene-002",
      startSeconds: 3,
      endSeconds: 8,
      text: "Second voice"
    });
  });

  it("produces deterministic output for identical input", () => {
    const first = buildTimeline(script);
    const second = buildTimeline(structuredClone(script));

    expect(first).toEqual(second);
  });

  it("rejects timeline overflow", () => {
    const result = buildTimeline({
      ...script,
      settings: {
        ...script.settings,
        maxDurationSeconds: 7
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "TIMELINE-TIME-002",
          sceneId: "scene-002"
        })
      );
    }
  });
});

describe("validateTimelineTiming", () => {
  it("detects overlapping normalized scenes", () => {
    const result = buildTimeline(script);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected timeline build to pass.");
    }

    const brokenTimeline: Timeline = {
      ...result.timeline,
      scenes: [
        result.timeline.scenes[0]!,
        {
          ...result.timeline.scenes[1]!,
          startSeconds: 2,
          startFrame: 60
        }
      ]
    };

    expect(validateTimelineTiming(brokenTimeline)).toContainEqual(
      expect.objectContaining({
        code: "TIMELINE-TIME-001",
        sceneId: "scene-002"
      })
    );
  });

  it("detects invalid frame boundaries", () => {
    const result = buildTimeline(script);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected timeline build to pass.");
    }

    const brokenTimeline: Timeline = {
      ...result.timeline,
      scenes: [
        {
          ...result.timeline.scenes[0]!,
          endFrameExclusive: 0
        },
        result.timeline.scenes[1]!
      ]
    };

    expect(validateTimelineTiming(brokenTimeline)).toContainEqual(
      expect.objectContaining({
        code: "TIMELINE-TIME-003",
        sceneId: "scene-001"
      })
    );
  });
});
