import type { JsonObject } from "./persistence.js";
import type { ProjectLanguage } from "./runtime.js";

export interface JsonScriptProject {
  readonly name: string;
  readonly language: ProjectLanguage;
}

export interface JsonScriptSettings {
  readonly aspectRatio: "9:16";
  readonly width: 1080;
  readonly height: 1920;
  readonly fps: number;
  readonly maxDurationSeconds: number;
  readonly voiceEnabled: boolean;
  readonly musicEnabled: boolean;
  readonly subtitleEnabled: boolean;
}

export interface JsonScriptSource {
  readonly kind: "color" | "asset";
  readonly value?: string;
  readonly path?: string;
}

export interface JsonScriptLayer {
  readonly id: string;
  readonly type: "background" | "text" | "image" | "video";
  readonly content?: string;
  readonly source?: JsonScriptSource;
  readonly animation?: JsonObject;
}

export interface JsonScriptScene {
  readonly id: string;
  readonly durationSeconds: number;
  readonly layers: readonly JsonScriptLayer[];
  readonly voice?: {
    readonly text: string;
  };
}

export interface JsonScript {
  readonly version: "1.0";
  readonly project: JsonScriptProject;
  readonly settings: JsonScriptSettings;
  readonly scenes: readonly JsonScriptScene[];
}
