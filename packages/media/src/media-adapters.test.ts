import { describe, expect, it } from "vitest";
import type { Timeline } from "@ovaf/contracts";
import { buildMediaPlan } from "./media-plan.js";
import { buildMusicTrackPlan } from "./music-plan.js";
import { buildSubtitleDocument, formatSrtTimestamp } from "./subtitle-document.js";
import { buildVoiceSynthesisRequests } from "./voice-plan.js";

describe("buildMediaPlan", () => {
  it("builds voice requests, subtitle document, music plan and timed audio tracks", () => {
    const result = buildMediaPlan({
      musicSource: {
        id: "music-bed",
        path: "assets/music.wav",
        volume: 0.2
      },
      providerId: "voice-provider",
      timeline: createTimeline(),
      voiceAssets: [
        {
          cacheKey: "voice-cache-1",
          durationSeconds: 2,
          id: "voice-scene-001",
          path: "assets/voice-1.wav",
          sceneId: "scene-001",
          startSeconds: 0,
          volume: 0.95
        },
        {
          cacheKey: "voice-cache-2",
          durationSeconds: 3,
          id: "voice-scene-002",
          path: "assets/voice-2.wav",
          sceneId: "scene-002",
          startSeconds: 2
        }
      ],
      voiceProfileId: "vi-default"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected media plan to build.");
    }

    expect(result.plan.featureToggles).toEqual({
      musicEnabled: true,
      subtitleEnabled: true,
      voiceEnabled: true
    });
    expect(result.plan.voiceRequests).toHaveLength(2);
    expect(result.plan.voiceRequests[0]).toMatchObject({
      cacheKey: expect.stringMatching(/^voice:/u),
      id: "voice-scene-001",
      providerId: "voice-provider",
      sceneId: "scene-001",
      voiceProfileId: "vi-default"
    });
    expect(result.plan.subtitleDocument?.content).toContain("00:00:02,000 --> 00:00:05,000");
    expect(result.plan.musicTrack?.audioTrack).toMatchObject({
      durationSeconds: 5,
      id: "music-bed",
      loop: true,
      startSeconds: 0,
      volume: 0.2
    });
    expect(result.plan.audioTracks).toEqual([
      {
        durationSeconds: 2,
        id: "voice-scene-001",
        path: "assets/voice-1.wav",
        startSeconds: 0,
        volume: 0.95
      },
      {
        durationSeconds: 3,
        id: "voice-scene-002",
        path: "assets/voice-2.wav",
        startSeconds: 2,
        volume: 1
      },
      {
        durationSeconds: 5,
        id: "music-bed",
        loop: true,
        path: "assets/music.wav",
        startSeconds: 0,
        volume: 0.2
      }
    ]);
    expect(result.plan.cacheKey).toMatch(/^media-plan:/u);
  });

  it("returns an empty optional media plan when features are disabled", () => {
    const result = buildMediaPlan({
      timeline: createTimeline({
        musicEnabled: false,
        subtitleEnabled: false,
        voiceEnabled: false
      })
    });

    expect(result).toMatchObject({
      ok: true,
      plan: {
        audioTracks: [],
        featureToggles: {
          musicEnabled: false,
          subtitleEnabled: false,
          voiceEnabled: false
        },
        voiceRequests: []
      }
    });
  });

  it("fails clearly when music is enabled without a source", () => {
    const result = buildMediaPlan({
      timeline: createTimeline()
    });

    expect(result).toEqual({
      issues: [
        {
          code: "MEDIA-MUSIC-001",
          humanReadableMessage: "Music is enabled but no music source was provided.",
          path: "/musicSource",
          technicalDetails: "Pass a MusicTrackSource to the media adapter or disable settings.musicEnabled."
        }
      ],
      ok: false
    });
  });

  it("fails clearly when voice or subtitle cues are missing", () => {
    const timeline = createTimeline();
    const firstScene = timeline.scenes[0];
    const secondScene = timeline.scenes[1];
    if (firstScene === undefined || secondScene === undefined) {
      throw new Error("Expected test timeline scenes.");
    }
    const brokenTimeline: Timeline = {
      ...timeline,
      scenes: [
        {
          durationFrames: firstScene.durationFrames,
          durationSeconds: firstScene.durationSeconds,
          endFrameExclusive: firstScene.endFrameExclusive,
          endSeconds: firstScene.endSeconds,
          id: firstScene.id,
          index: firstScene.index,
          layers: firstScene.layers,
          startFrame: firstScene.startFrame,
          startSeconds: firstScene.startSeconds
        },
        secondScene
      ]
    };

    const result = buildMediaPlan({
      musicSource: {
        id: "music-bed",
        path: "assets/music.wav"
      },
      timeline: brokenTimeline
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ code: "MEDIA-VOICE-001", sceneId: "scene-001" }),
        expect.objectContaining({ code: "MEDIA-SUBTITLE-001", sceneId: "scene-001" })
      ]);
    }
  });
});

describe("media adapter helpers", () => {
  it("builds deterministic voice cache keys", () => {
    const timeline = createTimeline();
    const first = buildVoiceSynthesisRequests(timeline, {
      providerId: "voice-provider",
      voiceProfileId: "vi-default"
    });
    const second = buildVoiceSynthesisRequests(timeline, {
      providerId: "voice-provider",
      voiceProfileId: "vi-default"
    });
    const changed = buildVoiceSynthesisRequests(timeline, {
      providerId: "voice-provider",
      voiceProfileId: "vi-alt"
    });

    expect(first.requests.map((request) => request.cacheKey)).toEqual(
      second.requests.map((request) => request.cacheKey)
    );
    expect(first.requests[0]?.cacheKey).not.toBe(changed.requests[0]?.cacheKey);
  });

  it("builds SRT subtitle documents from timeline cues", () => {
    const result = buildSubtitleDocument(createTimeline());

    expect(result.issues).toEqual([]);
    expect(result.document?.content).toBe(
      "1\n00:00:00,000 --> 00:00:02,000\nXin chao\n\n2\n00:00:02,000 --> 00:00:05,000\nHay render video\n"
    );
  });

  it("formats SRT timestamps with millisecond precision", () => {
    expect(formatSrtTimestamp(65.4321)).toBe("00:01:05,432");
  });

  it("validates music source volume", () => {
    const result = buildMusicTrackPlan(createTimeline(), {
      id: "music-bed",
      path: "assets/music.wav",
      volume: 3
    });

    expect(result).toEqual({
      issues: [
        {
          code: "MEDIA-MUSIC-001",
          humanReadableMessage: "Music source volume is invalid.",
          path: "/musicSource/volume",
          technicalDetails: "Music source volume must be between 0 and 2."
        }
      ],
      track: null
    });
  });
});

function createTimeline(
  settings: Partial<Timeline["settings"]> = {}
): Timeline {
  return {
    durationFrames: 150,
    durationSeconds: 5,
    inputFingerprint: "timeline-fingerprint",
    project: {
      language: "vi",
      name: "Example"
    },
    scenes: [
      {
        durationFrames: 60,
        durationSeconds: 2,
        endFrameExclusive: 60,
        endSeconds: 2,
        id: "scene-001",
        index: 0,
        layers: [],
        startFrame: 0,
        startSeconds: 0,
        subtitleCue: {
          endSeconds: 2,
          sceneId: "scene-001",
          startSeconds: 0,
          text: "Xin chao"
        },
        voiceCue: {
          endSeconds: 2,
          sceneId: "scene-001",
          startSeconds: 0,
          text: "Xin chao"
        }
      },
      {
        durationFrames: 90,
        durationSeconds: 3,
        endFrameExclusive: 150,
        endSeconds: 5,
        id: "scene-002",
        index: 1,
        layers: [],
        startFrame: 60,
        startSeconds: 2,
        subtitleCue: {
          endSeconds: 5,
          sceneId: "scene-002",
          startSeconds: 2,
          text: "Hay render video"
        },
        voiceCue: {
          endSeconds: 5,
          sceneId: "scene-002",
          startSeconds: 2,
          text: "Hay render video"
        }
      }
    ],
    settings: {
      aspectRatio: "9:16",
      fps: 30,
      height: 1920,
      maxDurationSeconds: 60,
      musicEnabled: true,
      subtitleEnabled: true,
      voiceEnabled: true,
      width: 1080,
      ...settings
    },
    version: "1.0"
  };
}
