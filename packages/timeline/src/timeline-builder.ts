import { createHash } from "node:crypto";
import type {
  JsonObject,
  JsonScript,
  JsonScriptLayer,
  JsonScriptScene,
  Timeline,
  TimelineBuildResult,
  TimelineCue,
  TimelineIssue,
  TimelineLayer,
  TimelineScene
} from "@ovaf/contracts";

export function buildTimeline(script: JsonScript): TimelineBuildResult {
  const scenes = buildScenes(script);
  const durationSeconds = roundSeconds(scenes.at(-1)?.endSeconds ?? 0);
  const durationFrames = scenes.reduce((total, scene) => total + scene.durationFrames, 0);

  const timeline: Timeline = {
    version: "1.0",
    inputFingerprint: fingerprintJson(script),
    project: script.project,
    settings: script.settings,
    durationSeconds,
    durationFrames,
    scenes
  };

  const issues = validateTimelineTiming(timeline);

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  return {
    ok: true,
    timeline
  };
}

export function validateTimelineTiming(timeline: Timeline): readonly TimelineIssue[] {
  const issues: TimelineIssue[] = [];
  let previousEndSeconds = 0;
  let previousEndFrameExclusive = 0;

  for (const scene of timeline.scenes) {
    if (
      scene.durationSeconds <= 0 ||
      scene.durationFrames <= 0 ||
      scene.startSeconds >= scene.endSeconds ||
      scene.startFrame >= scene.endFrameExclusive
    ) {
      issues.push({
        code: "TIMELINE-TIME-003",
        path: `/scenes/${scene.index}`,
        sceneId: scene.id,
        humanReadableMessage: "Timeline scene has invalid timing boundaries.",
        technicalDetails: `Scene ${scene.id} has start=${scene.startSeconds}, end=${scene.endSeconds}, startFrame=${scene.startFrame}, endFrameExclusive=${scene.endFrameExclusive}.`
      });
    }

    if (scene.startSeconds < previousEndSeconds || scene.startFrame < previousEndFrameExclusive) {
      issues.push({
        code: "TIMELINE-TIME-001",
        path: `/scenes/${scene.index}`,
        sceneId: scene.id,
        humanReadableMessage: "Timeline scenes must not overlap.",
        technicalDetails: `Scene ${scene.id} starts before the previous scene ends.`
      });
    }

    if (scene.endSeconds > timeline.settings.maxDurationSeconds) {
      issues.push({
        code: "TIMELINE-TIME-002",
        path: `/scenes/${scene.index}`,
        sceneId: scene.id,
        humanReadableMessage: "Timeline scene exceeds configured video duration.",
        technicalDetails: `Scene ${scene.id} ends at ${scene.endSeconds}, limit is ${timeline.settings.maxDurationSeconds}.`
      });
    }

    previousEndSeconds = scene.endSeconds;
    previousEndFrameExclusive = scene.endFrameExclusive;
  }

  if (timeline.durationSeconds > timeline.settings.maxDurationSeconds) {
    issues.push({
      code: "TIMELINE-TIME-002",
      path: "/durationSeconds",
      humanReadableMessage: "Timeline duration exceeds configured video duration.",
      technicalDetails: `Timeline duration is ${timeline.durationSeconds}, limit is ${timeline.settings.maxDurationSeconds}.`
    });
  }

  return issues;
}

function buildScenes(script: JsonScript): readonly TimelineScene[] {
  let cursorSeconds = 0;

  return script.scenes.map((scene, index) => {
    const startSeconds = roundSeconds(cursorSeconds);
    const endSeconds = roundSeconds(startSeconds + scene.durationSeconds);
    const startFrame = secondsToFrame(startSeconds, script.settings.fps);
    const endFrameExclusive = secondsToFrame(endSeconds, script.settings.fps);
    const durationFrames = endFrameExclusive - startFrame;
    cursorSeconds = endSeconds;

    const voiceCue = buildVoiceCue(script, scene, startSeconds, endSeconds);
    const subtitleCue = buildSubtitleCue(script, scene, startSeconds, endSeconds);

    return {
      id: scene.id,
      index,
      startSeconds,
      endSeconds,
      durationSeconds: scene.durationSeconds,
      startFrame,
      endFrameExclusive,
      durationFrames,
      layers: scene.layers.map(mapLayer),
      ...(voiceCue === undefined ? {} : { voiceCue }),
      ...(subtitleCue === undefined ? {} : { subtitleCue })
    };
  });
}

function mapLayer(layer: JsonScriptLayer, index: number): TimelineLayer {
  return {
    id: layer.id,
    type: layer.type,
    zIndex: index,
    ...(layer.content === undefined ? {} : { content: layer.content }),
    ...(layer.source === undefined ? {} : { source: layer.source }),
    ...(layer.animation === undefined ? {} : { animation: layer.animation })
  };
}

function buildVoiceCue(
  script: JsonScript,
  scene: JsonScriptScene,
  startSeconds: number,
  endSeconds: number
): TimelineCue | undefined {
  if (!script.settings.voiceEnabled || scene.voice?.text.trim() === undefined) {
    return undefined;
  }

  return {
    sceneId: scene.id,
    startSeconds,
    endSeconds,
    text: scene.voice.text
  };
}

function buildSubtitleCue(
  script: JsonScript,
  scene: JsonScriptScene,
  startSeconds: number,
  endSeconds: number
): TimelineCue | undefined {
  if (!script.settings.subtitleEnabled) {
    return undefined;
  }

  const subtitleText = scene.voice?.text.trim() || scene.layers.find((layer) => layer.type === "text")?.content?.trim();

  if (subtitleText === undefined || subtitleText.length === 0) {
    return undefined;
  }

  return {
    sceneId: scene.id,
    startSeconds,
    endSeconds,
    text: subtitleText
  };
}

function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

function roundSeconds(value: number): number {
  return Number(value.toFixed(6));
}

function fingerprintJson(value: JsonObject | JsonScript): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
