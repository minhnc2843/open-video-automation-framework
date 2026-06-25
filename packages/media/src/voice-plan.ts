import type { MediaPlanIssue, Timeline, VoiceSynthesisRequest } from "@ovaf/contracts";
import { buildMediaCacheKey } from "./cache-key.js";

export interface BuildVoiceSynthesisRequestsOptions {
  readonly providerId?: string;
  readonly voiceProfileId?: string;
}

export interface VoiceSynthesisRequestBuildResult {
  readonly requests: readonly VoiceSynthesisRequest[];
  readonly issues: readonly MediaPlanIssue[];
}

export function buildVoiceSynthesisRequests(
  timeline: Timeline,
  options: BuildVoiceSynthesisRequestsOptions = {}
): VoiceSynthesisRequestBuildResult {
  if (!timeline.settings.voiceEnabled) {
    return {
      issues: [],
      requests: []
    };
  }

  const issues: MediaPlanIssue[] = [];
  const requests: VoiceSynthesisRequest[] = [];

  for (const scene of timeline.scenes) {
    if (scene.voiceCue === undefined) {
      issues.push({
        code: "MEDIA-VOICE-001",
        humanReadableMessage: "Voice is enabled but a scene has no voice cue.",
        path: `/scenes/${scene.index}/voiceCue`,
        sceneId: scene.id,
        technicalDetails: `Scene ${scene.id} cannot be sent to a voice adapter without voice cue text.`
      });
      continue;
    }

    const durationSeconds = roundSeconds(scene.voiceCue.endSeconds - scene.voiceCue.startSeconds);
    const requestBase = {
      durationSeconds,
      endSeconds: scene.voiceCue.endSeconds,
      language: timeline.project.language,
      sceneId: scene.id,
      startSeconds: scene.voiceCue.startSeconds,
      text: scene.voiceCue.text
    };
    requests.push({
      ...requestBase,
      cacheKey: buildMediaCacheKey("voice", {
        ...requestBase,
        providerId: options.providerId ?? null,
        voiceProfileId: options.voiceProfileId ?? null
      }),
      id: `voice-${scene.id}`,
      ...(options.providerId === undefined ? {} : { providerId: options.providerId }),
      ...(options.voiceProfileId === undefined ? {} : { voiceProfileId: options.voiceProfileId })
    });
  }

  return {
    issues,
    requests
  };
}

function roundSeconds(value: number): number {
  return Number(value.toFixed(6));
}
