import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CacheEntry, CacheValidationResult } from "@ovaf/contracts";

export async function writeCacheEntry(metadataPath: string, entry: CacheEntry): Promise<void> {
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}

export async function readCacheEntry(metadataPath: string): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(metadataPath, "utf8");
    return JSON.parse(raw) as CacheEntry;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function validateCacheEntry(
  entry: CacheEntry | null,
  expected: {
    readonly inputFingerprint: string;
    readonly generatorVersion: string;
  }
): Promise<CacheValidationResult> {
  if (entry === null) {
    return {
      state: "missing",
      reason: "Cache metadata entry does not exist."
    };
  }

  if (entry.inputFingerprint !== expected.inputFingerprint) {
    return {
      state: "invalid",
      reason: "Cache input fingerprint does not match."
    };
  }

  if (entry.generatorVersion !== expected.generatorVersion) {
    return {
      state: "invalid",
      reason: "Cache generator version does not match."
    };
  }

  if (entry.validationState !== "valid") {
    return {
      state: entry.validationState,
      reason: `Cache entry state is ${entry.validationState}.`
    };
  }

  try {
    const fileStats = await stat(entry.filePath);
    if (!fileStats.isFile()) {
      return {
        state: "invalid",
        reason: "Cache file path is not a file."
      };
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {
        state: "missing",
        reason: "Cache output file does not exist."
      };
    }

    throw error;
  }

  return {
    state: "valid",
    reason: "Cache entry is valid."
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
