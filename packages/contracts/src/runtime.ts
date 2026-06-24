export const SUPPORTED_PROJECT_LANGUAGES = ["vi", "en"] as const;
export const SUPPORTED_ASPECT_RATIO = "9:16";
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const MAX_VIDEO_DURATION_SECONDS = 60;

export type ProjectLanguage = (typeof SUPPORTED_PROJECT_LANGUAGES)[number];
export type SupportedAspectRatio = typeof SUPPORTED_ASPECT_RATIO;

export interface VerticalVideoSettings {
  readonly aspectRatio: SupportedAspectRatio;
  readonly width: typeof VIDEO_WIDTH;
  readonly height: typeof VIDEO_HEIGHT;
  readonly fps: number;
  readonly maxDurationSeconds: number;
  readonly voiceEnabled: boolean;
  readonly musicEnabled: boolean;
  readonly subtitleEnabled: boolean;
}

export interface RuntimeStoragePaths {
  readonly projects: string;
  readonly assets: string;
  readonly cache: string;
  readonly logs: string;
  readonly temp: string;
  readonly output: string;
}
