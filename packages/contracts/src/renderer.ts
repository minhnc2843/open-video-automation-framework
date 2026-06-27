import type { CacheEntry } from "./assets.js";
import type { TimelineScene } from "./timeline.js";

export interface HtmlSceneDocument {
  readonly sceneId: string;
  readonly html: string;
}

export interface ScenePreviewResult {
  readonly sceneId: string;
  readonly htmlPath: string;
}

export interface SceneCaptureResult {
  readonly sceneId: string;
  readonly imagePath: string;
  readonly fromCache: boolean;
  readonly cacheEntry: CacheEntry;
}

export interface HtmlSceneRenderInput {
  readonly scene: TimelineScene;
  readonly width: 1080;
  readonly height: 1920;
  readonly fps: number;
  readonly timeMs?: number;
}
