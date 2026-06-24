import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CacheEntry, JsonObject } from "@ovaf/contracts";
import { createLocalAssetRecord, deriveAssetStoragePath } from "./asset-records.js";
import { readCacheEntry, validateCacheEntry, writeCacheEntry } from "./cache-store.js";
import { hashBuffer, hashFile, hashJson } from "./hashing.js";
import { createSceneInputFingerprint } from "./scene-fingerprint.js";

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-assets-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("asset hashing", () => {
  it("hashes files deterministically", async () => {
    const filePath = path.join(tempRoot, "asset.txt");
    writeFileSync(filePath, "hello asset", "utf8");

    await expect(hashFile(filePath)).resolves.toBe(hashBuffer(Buffer.from("hello asset")));
    await expect(hashFile(filePath)).resolves.toBe(await hashFile(filePath));
  });

  it("hashes JSON independent of object key insertion order", () => {
    const left: JsonObject = { b: 2, a: { y: "yes", x: "xray" } };
    const right: JsonObject = { a: { x: "xray", y: "yes" }, b: 2 };

    expect(hashJson(left)).toBe(hashJson(right));
  });
});

describe("asset records", () => {
  it("creates local asset records with hash, size and storage path", async () => {
    const filePath = path.join(tempRoot, "input.png");
    writeFileSync(filePath, "fake-png", "utf8");

    const record = await createLocalAssetRecord({
      id: "asset-1",
      sourcePath: filePath,
      storageRoot: tempRoot,
      mimeType: "image/png",
      now: new Date("2026-06-24T00:00:00.000Z")
    });

    expect(record).toMatchObject({
      id: "asset-1",
      kind: "local",
      sizeBytes: 8,
      originalPath: filePath,
      mimeType: "image/png",
      createdAt: "2026-06-24T00:00:00.000Z"
    });
    expect(record.hash).toHaveLength(64);
    expect(record.storagePath).toContain(path.join(tempRoot, "assets", record.hash.slice(0, 2)));
    expect(record.storagePath.endsWith(".png")).toBe(true);
  });

  it("rejects invalid storage path hashes", () => {
    expect(() =>
      deriveAssetStoragePath({
        storageRoot: tempRoot,
        hash: "not-a-sha",
        originalPath: "asset.png"
      })
    ).toThrow(/ASSET-PATH-001/);
  });
});

describe("cache entries", () => {
  it("writes, reads and validates cache metadata with existing output file", async () => {
    const outputPath = path.join(tempRoot, "cache-output.txt");
    const metadataPath = path.join(tempRoot, "cache", "entry.json");
    writeFileSync(outputPath, "cached", "utf8");

    const entry: CacheEntry = {
      cacheKey: "scene-1",
      inputFingerprint: "fingerprint-a",
      generatorVersion: "renderer-html@0.0.0",
      filePath: outputPath,
      createdAt: "2026-06-24T00:00:00.000Z",
      validationState: "valid"
    };

    await writeCacheEntry(metadataPath, entry);

    const readEntry = await readCacheEntry(metadataPath);
    expect(readEntry).toEqual(entry);
    await expect(
      validateCacheEntry(readEntry, {
        inputFingerprint: "fingerprint-a",
        generatorVersion: "renderer-html@0.0.0"
      })
    ).resolves.toEqual({
      state: "valid",
      reason: "Cache entry is valid."
    });
  });

  it("detects stale and missing cache entries", async () => {
    const entry: CacheEntry = {
      cacheKey: "scene-1",
      inputFingerprint: "fingerprint-a",
      generatorVersion: "renderer-html@0.0.0",
      filePath: path.join(tempRoot, "missing.txt"),
      createdAt: "2026-06-24T00:00:00.000Z",
      validationState: "valid"
    };

    await expect(
      validateCacheEntry(entry, {
        inputFingerprint: "fingerprint-b",
        generatorVersion: "renderer-html@0.0.0"
      })
    ).resolves.toMatchObject({
      state: "invalid",
      reason: "Cache input fingerprint does not match."
    });

    await expect(
      validateCacheEntry(entry, {
        inputFingerprint: "fingerprint-a",
        generatorVersion: "renderer-html@0.0.0"
      })
    ).resolves.toMatchObject({
      state: "missing",
      reason: "Cache output file does not exist."
    });

    await expect(readCacheEntry(path.join(tempRoot, "missing-entry.json"))).resolves.toBeNull();
  });
});

describe("scene input fingerprints", () => {
  const scene = {
    id: "scene-001",
    startSeconds: 0,
    endSeconds: 5,
    layers: [
      {
        id: "text-1",
        type: "text",
        content: "hello"
      }
    ]
  } satisfies JsonObject;

  const renderSettings = {
    width: 1080,
    height: 1920,
    fps: 30
  } satisfies JsonObject;

  it("creates deterministic fingerprints independent of asset fingerprint order", () => {
    const first = createSceneInputFingerprint({
      scene,
      renderSettings,
      generatorVersion: "renderer-html@0.0.0",
      assetFingerprints: ["b", "a"]
    });
    const second = createSceneInputFingerprint({
      scene,
      renderSettings,
      generatorVersion: "renderer-html@0.0.0",
      assetFingerprints: ["a", "b"]
    });

    expect(first).toBe(second);
  });

  it("changes fingerprints when scene, settings, assets or generator version changes", () => {
    const baseline = createSceneInputFingerprint({
      scene,
      renderSettings,
      generatorVersion: "renderer-html@0.0.0",
      assetFingerprints: ["asset-a"]
    });

    expect(
      createSceneInputFingerprint({
        scene: { ...scene, endSeconds: 6 },
        renderSettings,
        generatorVersion: "renderer-html@0.0.0",
        assetFingerprints: ["asset-a"]
      })
    ).not.toBe(baseline);
    expect(
      createSceneInputFingerprint({
        scene,
        renderSettings: { ...renderSettings, fps: 60 },
        generatorVersion: "renderer-html@0.0.0",
        assetFingerprints: ["asset-a"]
      })
    ).not.toBe(baseline);
    expect(
      createSceneInputFingerprint({
        scene,
        renderSettings,
        generatorVersion: "renderer-html@0.0.1",
        assetFingerprints: ["asset-a"]
      })
    ).not.toBe(baseline);
    expect(
      createSceneInputFingerprint({
        scene,
        renderSettings,
        generatorVersion: "renderer-html@0.0.0",
        assetFingerprints: ["asset-b"]
      })
    ).not.toBe(baseline);
  });
});
