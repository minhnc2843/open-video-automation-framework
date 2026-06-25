import type { MediaPlanIssue, SubtitleCue, SubtitleDocument, Timeline } from "@ovaf/contracts";
import { buildMediaCacheKey } from "./cache-key.js";

export interface SubtitleDocumentBuildResult {
  readonly document: SubtitleDocument | null;
  readonly issues: readonly MediaPlanIssue[];
}

export function buildSubtitleDocument(timeline: Timeline): SubtitleDocumentBuildResult {
  if (!timeline.settings.subtitleEnabled) {
    return {
      document: null,
      issues: []
    };
  }

  const issues: MediaPlanIssue[] = [];
  const cues: SubtitleCue[] = [];

  for (const scene of timeline.scenes) {
    if (scene.subtitleCue === undefined) {
      issues.push({
        code: "MEDIA-SUBTITLE-001",
        humanReadableMessage: "Subtitles are enabled but a scene has no subtitle cue.",
        path: `/scenes/${scene.index}/subtitleCue`,
        sceneId: scene.id,
        technicalDetails: `Scene ${scene.id} cannot be included in a subtitle document without text.`
      });
      continue;
    }

    cues.push({
      endSeconds: scene.subtitleCue.endSeconds,
      id: `subtitle-${scene.id}`,
      index: scene.index + 1,
      sceneId: scene.id,
      startSeconds: scene.subtitleCue.startSeconds,
      text: scene.subtitleCue.text
    });
  }

  if (issues.length > 0) {
    return {
      document: null,
      issues
    };
  }

  const content = cues.map(formatSrtCue).join("\n\n");
  const document: SubtitleDocument = {
    cacheKey: buildMediaCacheKey("subtitle", {
      cues: cues.map((cue) => ({
        endSeconds: cue.endSeconds,
        sceneId: cue.sceneId,
        startSeconds: cue.startSeconds,
        text: cue.text
      })),
      format: "srt",
      timelineFingerprint: timeline.inputFingerprint
    }),
    content: content.length === 0 ? "" : `${content}\n`,
    cues,
    format: "srt"
  };

  return {
    document,
    issues: []
  };
}

function formatSrtCue(cue: SubtitleCue): string {
  return `${cue.index}\n${formatSrtTimestamp(cue.startSeconds)} --> ${formatSrtTimestamp(cue.endSeconds)}\n${cue.text}`;
}

export function formatSrtTimestamp(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const displaySeconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(displaySeconds, 2)},${pad(milliseconds, 3)}`;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}
