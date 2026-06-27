import type { CacheEntry, HtmlSceneRenderInput, JsonObject, SceneCaptureResult } from "@ovaf/contracts";
import { createSceneInputFingerprint, readCacheEntry, validateCacheEntry, writeCacheEntry } from "@ovaf/asset-manager";

export interface RenderSceneWithCacheOptions {
  readonly metadataPath: string;
  readonly outputPath: string;
  readonly generatorVersion: string;
  readonly assetFingerprints?: readonly string[];
  readonly render: (outputPath: string) => Promise<void>;
  readonly now?: Date;
}

export async function renderSceneWithCache(
  input: HtmlSceneRenderInput,
  options: RenderSceneWithCacheOptions
): Promise<SceneCaptureResult> {
  const fingerprintInput = {
    scene: toJsonObject(input.scene),
    renderSettings: {
      width: input.width,
      height: input.height,
      fps: input.fps,
      ...(input.timeMs === undefined ? {} : { timeMs: input.timeMs })
    },
    generatorVersion: options.generatorVersion,
    ...(options.assetFingerprints === undefined ? {} : { assetFingerprints: options.assetFingerprints })
  };
  const inputFingerprint = createSceneInputFingerprint(fingerprintInput);
  const existingEntry = await readCacheEntry(options.metadataPath);
  const validation = await validateCacheEntry(existingEntry, {
    inputFingerprint,
    generatorVersion: options.generatorVersion
  });

  if (existingEntry !== null && validation.state === "valid") {
    return {
      sceneId: input.scene.id,
      imagePath: existingEntry.filePath,
      fromCache: true,
      cacheEntry: existingEntry
    };
  }

  await options.render(options.outputPath);

  const cacheEntry: CacheEntry = {
    cacheKey: input.scene.id,
    inputFingerprint,
    generatorVersion: options.generatorVersion,
    filePath: options.outputPath,
    createdAt: (options.now ?? new Date()).toISOString(),
    validationState: "valid"
  };
  await writeCacheEntry(options.metadataPath, cacheEntry);

  return {
    sceneId: input.scene.id,
    imagePath: options.outputPath,
    fromCache: false,
    cacheEntry
  };
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
