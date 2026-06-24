import type { JsonObject, SceneInputFingerprintInput } from "@ovaf/contracts";
import { hashJson } from "./hashing.js";

export function createSceneInputFingerprint(input: SceneInputFingerprintInput): string {
  const normalized: JsonObject = {
    scene: input.scene,
    renderSettings: input.renderSettings,
    generatorVersion: input.generatorVersion,
    assetFingerprints: [...(input.assetFingerprints ?? [])].sort()
  };

  return hashJson(normalized);
}
