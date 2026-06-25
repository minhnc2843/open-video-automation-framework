import { hashJson } from "@ovaf/asset-manager";
import type { JsonObject } from "@ovaf/contracts";

const MEDIA_CACHE_VERSION = "media-adapters-v1";

export function buildMediaCacheKey(kind: string, input: JsonObject): string {
  return `${kind}:${hashJson({
    engineVersion: MEDIA_CACHE_VERSION,
    input,
    kind
  })}`;
}
