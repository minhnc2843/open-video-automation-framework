import type {
  AudioTrackInput,
  MediaFeatureToggles,
  MediaPlan,
  MediaPlanBuildResult,
  MediaPlanInput,
  MediaPlanIssue
} from "@ovaf/contracts";
import { buildMediaCacheKey } from "./cache-key.js";
import { buildMusicTrackPlan } from "./music-plan.js";
import { buildSubtitleDocument } from "./subtitle-document.js";
import { buildVoiceSynthesisRequests, type BuildVoiceSynthesisRequestsOptions } from "./voice-plan.js";

export function buildMediaPlan(input: MediaPlanInput): MediaPlanBuildResult {
  const timeline = input.timeline;
  const voiceOptions: BuildVoiceSynthesisRequestsOptions = {
    ...(input.providerId === undefined ? {} : { providerId: input.providerId }),
    ...(input.voiceProfileId === undefined ? {} : { voiceProfileId: input.voiceProfileId })
  };
  const voice = buildVoiceSynthesisRequests(timeline, voiceOptions);
  const subtitle = buildSubtitleDocument(timeline);
  const music = buildMusicTrackPlan(timeline, input.musicSource);
  const voiceAudio = buildVoiceAudioTracks(input);
  const issues = [...voice.issues, ...subtitle.issues, ...music.issues, ...voiceAudio.issues];

  if (issues.length > 0) {
    return {
      issues,
      ok: false
    };
  }

  const audioTracks: AudioTrackInput[] = [
    ...voiceAudio.audioTracks,
    ...(music.track === null ? [] : [music.track.audioTrack])
  ];
  const featureToggles: MediaFeatureToggles = {
    musicEnabled: timeline.settings.musicEnabled,
    subtitleEnabled: timeline.settings.subtitleEnabled,
    voiceEnabled: timeline.settings.voiceEnabled
  };
  const plan: MediaPlan = {
    audioTracks,
    cacheKey: buildMediaCacheKey("media-plan", {
      audioTracks: audioTracks.map((track) => ({
        durationSeconds: track.durationSeconds ?? null,
        id: track.id,
        loop: track.loop ?? false,
        path: track.path,
        startSeconds: track.startSeconds ?? 0,
        volume: track.volume ?? 1
      })),
      features: {
        musicEnabled: featureToggles.musicEnabled,
        subtitleEnabled: featureToggles.subtitleEnabled,
        voiceEnabled: featureToggles.voiceEnabled
      },
      musicCacheKey: music.track?.cacheKey ?? null,
      subtitleCacheKey: subtitle.document?.cacheKey ?? null,
      timelineFingerprint: timeline.inputFingerprint,
      voiceRequestCacheKeys: voice.requests.map((request) => request.cacheKey)
    }),
    featureToggles,
    timelineFingerprint: timeline.inputFingerprint,
    voiceRequests: voice.requests,
    ...(subtitle.document === null ? {} : { subtitleDocument: subtitle.document }),
    ...(music.track === null ? {} : { musicTrack: music.track })
  };

  return {
    ok: true,
    plan
  };
}

function buildVoiceAudioTracks(input: MediaPlanInput): {
  readonly audioTracks: readonly AudioTrackInput[];
  readonly issues: readonly MediaPlanIssue[];
} {
  if (!input.timeline.settings.voiceEnabled || input.voiceAssets === undefined) {
    return {
      audioTracks: [],
      issues: []
    };
  }

  const sceneIds = new Set(input.timeline.scenes.map((scene) => scene.id));
  const issues: MediaPlanIssue[] = [];
  const audioTracks: AudioTrackInput[] = [];

  for (const asset of input.voiceAssets) {
    if (!sceneIds.has(asset.sceneId)) {
      issues.push({
        code: "MEDIA-VOICE-001",
        humanReadableMessage: "Voice asset references an unknown scene.",
        path: `/voiceAssets/${asset.id}/sceneId`,
        sceneId: asset.sceneId,
        technicalDetails: `Voice asset ${asset.id} references scene ${asset.sceneId}, which is not present in the Timeline.`
      });
      continue;
    }

    if (asset.durationSeconds <= 0 || asset.startSeconds < 0) {
      issues.push({
        code: "MEDIA-TIMING-001",
        humanReadableMessage: "Voice asset timing is invalid.",
        path: `/voiceAssets/${asset.id}`,
        sceneId: asset.sceneId,
        technicalDetails: `Voice asset ${asset.id} has start=${asset.startSeconds} and duration=${asset.durationSeconds}.`
      });
      continue;
    }

    audioTracks.push({
      durationSeconds: asset.durationSeconds,
      id: asset.id,
      path: asset.path,
      startSeconds: asset.startSeconds,
      volume: asset.volume ?? 1
    });
  }

  return {
    audioTracks,
    issues
  };
}
