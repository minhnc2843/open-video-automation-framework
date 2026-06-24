import { stat } from "node:fs/promises";
import path from "node:path";
import type { AssetRecord, AssetKind } from "@ovaf/contracts";
import { hashFile } from "./hashing.js";

export interface CreateLocalAssetRecordInput {
  readonly id: string;
  readonly sourcePath: string;
  readonly storageRoot: string;
  readonly kind?: AssetKind;
  readonly mimeType?: string;
  readonly now?: Date;
}

export async function createLocalAssetRecord(input: CreateLocalAssetRecordInput): Promise<AssetRecord> {
  const [fileHash, fileStats] = await Promise.all([hashFile(input.sourcePath), stat(input.sourcePath)]);
  const storagePath = deriveAssetStoragePath({
    storageRoot: input.storageRoot,
    hash: fileHash,
    originalPath: input.sourcePath
  });

  return {
    id: input.id,
    kind: input.kind ?? "local",
    hash: fileHash,
    sizeBytes: fileStats.size,
    storagePath,
    originalPath: input.sourcePath,
    ...(input.mimeType === undefined ? {} : { mimeType: input.mimeType }),
    createdAt: (input.now ?? new Date()).toISOString()
  };
}

export interface DeriveAssetStoragePathInput {
  readonly storageRoot: string;
  readonly hash: string;
  readonly originalPath?: string;
}

export function deriveAssetStoragePath(input: DeriveAssetStoragePathInput): string {
  assertSha256(input.hash);

  const extension = input.originalPath === undefined ? "" : path.extname(input.originalPath).toLowerCase();
  const shard = input.hash.slice(0, 2);
  return path.join(input.storageRoot, "assets", shard, `${input.hash}${extension}`);
}

function assertSha256(hash: string): void {
  if (!/^[a-f0-9]{64}$/u.test(hash)) {
    throw new Error("ASSET-PATH-001: asset hash must be a lowercase SHA-256 hex string.");
  }
}
