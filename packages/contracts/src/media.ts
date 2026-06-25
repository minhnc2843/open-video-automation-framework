import type { AudioTrackInput } from "./encoder.js";
import type { FrameworkErrorCode } from "./errors.js";
import type { ProjectLanguage } from "./runtime.js";
import type { Timeline } from "./timeline.js";

export interface MediaFeatureToggles {
  readonly voiceEnabled: boolean;
  readonly subtitleEnabled: boolean;
  readonly musicEnabled: boolean;
}

export interface VoiceSynthesisRequest {
  readonly id: string;
  readonly sceneId: string;
  readonly language: ProjectLanguage;
  readonly text: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly cacheKey: string;
  readonly providerId?: string;
  readonly voiceProfileId?: string;
}

export interface VoiceAssetInput {
  readonly id: string;
  readonly sceneId: string;
  readonly path: string;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly cacheKey: string;
  readonly volume?: number;
}

export interface SubtitleCue {
  readonly id: string;
  readonly index: number;
  readonly sceneId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
}

export interface SubtitleDocument {
  readonly format: "srt" | "vtt";
  readonly content: string;
  readonly cues: readonly SubtitleCue[];
  readonly cacheKey: string;
}

export interface MusicTrackSource {
  readonly id: string;
  readonly path: string;
  readonly volume?: number;
  readonly loop?: boolean;
}

export interface MusicTrackPlan {
  readonly id: string;
  readonly source: MusicTrackSource;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly audioTrack: AudioTrackInput;
  readonly cacheKey: string;
}

export interface MediaPlanInput {
  readonly timeline: Timeline;
  readonly voiceAssets?: readonly VoiceAssetInput[];
  readonly musicSource?: MusicTrackSource;
  readonly providerId?: string;
  readonly voiceProfileId?: string;
}

export interface MediaPlan {
  readonly timelineFingerprint: string;
  readonly featureToggles: MediaFeatureToggles;
  readonly voiceRequests: readonly VoiceSynthesisRequest[];
  readonly subtitleDocument?: SubtitleDocument;
  readonly musicTrack?: MusicTrackPlan;
  readonly audioTracks: readonly AudioTrackInput[];
  readonly cacheKey: string;
}

export interface MediaPlanIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly sceneId?: string;
}

export interface MediaPlanBuildSuccess {
  readonly ok: true;
  readonly plan: MediaPlan;
}

export interface MediaPlanBuildFailure {
  readonly ok: false;
  readonly issues: readonly MediaPlanIssue[];
}

export type MediaPlanBuildResult = MediaPlanBuildSuccess | MediaPlanBuildFailure;
