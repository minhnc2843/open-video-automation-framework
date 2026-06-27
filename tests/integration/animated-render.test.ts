import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface RenderCliOutput {
  readonly outputPath: string;
}

interface ProbeStream {
  readonly codec_type?: string;
  readonly width?: number;
  readonly height?: number;
  readonly avg_frame_rate?: string;
  readonly r_frame_rate?: string;
}

interface ProbeOutput {
  readonly streams?: readonly ProbeStream[];
  readonly format?: {
    readonly duration?: string;
  };
}

describe("animated render acceptance", () => {
  it("renders animated-short as a changing frame-based MP4", () => {
    const storageRoot = mkdtempSync(path.join(tmpdir(), "ovaf-animated-render-"));

    try {
      const renderResult = spawnSync(process.execPath, ["scripts/render.mjs", "examples/animated-short.json"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          OVAF_STORAGE_ROOT: storageRoot
        }
      });

      expect(renderResult.status, renderResult.stderr).toBe(0);
      const renderOutput = JSON.parse(renderResult.stdout) as RenderCliOutput;
      expect(existsSync(renderOutput.outputPath)).toBe(true);

      const probe = probeMp4(renderOutput.outputPath);
      const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
      expect(videoStream).toBeDefined();
      expect(videoStream?.width).toBe(1080);
      expect(videoStream?.height).toBe(1920);
      expect(parseFrameRate(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate ?? "0/1")).toBeCloseTo(30, 2);
      expect(Number(probe.format?.duration ?? "0")).toBeCloseTo(10, 1);

      const frameDirectory = path.join(storageRoot, "sampled-frames");
      mkdirSync(frameDirectory, { recursive: true });
      const sampledFrames = [
        path.join(frameDirectory, "scene-first.png"),
        path.join(frameDirectory, "scene-middle.png"),
        path.join(frameDirectory, "scene-last.png")
      ];
      extractFrame(renderOutput.outputPath, 0.1, sampledFrames[0]!);
      extractFrame(renderOutput.outputPath, 2.5, sampledFrames[1]!);
      extractFrame(renderOutput.outputPath, 4.8, sampledFrames[2]!);

      const hashes = sampledFrames.map(hashFile);
      expect(new Set(hashes).size).toBe(3);
    } finally {
      rmSync(storageRoot, { force: true, recursive: true });
    }
  }, 180000);
});

function probeMp4(filePath: string): ProbeOutput {
  const result = spawnSync(process.env.FFPROBE_PATH ?? "ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ], {
    encoding: "utf8"
  });

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as ProbeOutput;
}

function extractFrame(inputPath: string, timeSeconds: number, outputPath: string): void {
  const result = spawnSync(process.env.FFMPEG_PATH ?? "ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-ss",
    timeSeconds.toFixed(3),
    "-frames:v",
    "1",
    outputPath
  ], {
    encoding: "utf8"
  });

  expect(result.status, result.stderr).toBe(0);
  expect(existsSync(outputPath)).toBe(true);
}

function hashFile(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function parseFrameRate(value: string): number {
  const [numeratorRaw, denominatorRaw] = value.split("/");
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}
