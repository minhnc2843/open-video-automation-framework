import type { MediaPlanIssue, MusicTrackPlan, MusicTrackSource, Timeline } from "@ovaf/contracts";
import { buildMediaCacheKey } from "./cache-key.js";

export interface MusicTrackBuildResult {
  readonly track: MusicTrackPlan | null;
  readonly issues: readonly MediaPlanIssue[];
}

export function buildMusicTrackPlan(timeline: Timeline, source?: MusicTrackSource): MusicTrackBuildResult {
  if (!timeline.settings.musicEnabled) {
    return {
      issues: [],
      track: null
    };
  }

  if (source === undefined || source.path.trim().length === 0) {
    return {
      issues: [
        {
          code: "MEDIA-MUSIC-001",
          humanReadableMessage: "Music is enabled but no music source was provided.",
          path: "/musicSource",
          technicalDetails: "Pass a MusicTrackSource to the media adapter or disable settings.musicEnabled."
        }
      ],
      track: null
    };
  }

  if (source.volume !== undefined && (source.volume < 0 || source.volume > 2)) {
    return {
      issues: [
        {
          code: "MEDIA-MUSIC-001",
          humanReadableMessage: "Music source volume is invalid.",
          path: "/musicSource/volume",
          technicalDetails: "Music source volume must be between 0 and 2."
        }
      ],
      track: null
    };
  }

  const durationSeconds = timeline.durationSeconds;
  const cacheKey = buildMediaCacheKey("music", {
    durationSeconds,
    id: source.id,
    loop: source.loop ?? false,
    path: source.path,
    timelineFingerprint: timeline.inputFingerprint,
    volume: source.volume ?? 0.25
  });
  const audioTrack = {
    durationSeconds,
    id: source.id,
    loop: source.loop ?? true,
    path: source.path,
    startSeconds: 0,
    volume: source.volume ?? 0.25
  };
  const track: MusicTrackPlan = {
    audioTrack,
    cacheKey,
    durationSeconds,
    endSeconds: durationSeconds,
    id: source.id,
    source,
    startSeconds: 0
  };

  return {
    issues: [],
    track
  };
}
