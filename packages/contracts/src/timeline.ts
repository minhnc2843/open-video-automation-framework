import type { FrameworkErrorCode } from "./errors.js";
import type { JsonScriptProject, JsonScriptSettings, LayerAnimation, SceneTransition } from "./script.js";

export interface TimelineLayer {
  readonly id: string;
  readonly type: "background" | "text" | "image" | "video";
  readonly zIndex: number;
  readonly content?: string;
  readonly source?: {
    readonly kind: "color" | "asset";
    readonly value?: string;
    readonly path?: string;
  };
  readonly animation?: LayerAnimation;
}

export interface TimelineCue {
  readonly sceneId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
}

export interface TimelineScene {
  readonly id: string;
  readonly index: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly startFrame: number;
  readonly endFrameExclusive: number;
  readonly durationFrames: number;
  readonly layers: readonly TimelineLayer[];
  readonly transition?: SceneTransition;
  readonly voiceCue?: TimelineCue;
  readonly subtitleCue?: TimelineCue;
}

export interface Timeline {
  readonly version: "1.0";
  readonly inputFingerprint: string;
  readonly project: JsonScriptProject;
  readonly settings: JsonScriptSettings;
  readonly durationSeconds: number;
  readonly durationFrames: number;
  readonly scenes: readonly TimelineScene[];
}

export interface TimelineIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly sceneId?: string;
}

export interface TimelineBuildSuccess {
  readonly ok: true;
  readonly timeline: Timeline;
}

export interface TimelineBuildFailure {
  readonly ok: false;
  readonly issues: readonly TimelineIssue[];
}

export type TimelineBuildResult = TimelineBuildSuccess | TimelineBuildFailure;
