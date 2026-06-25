import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProcessRunner } from "@ovaf/contracts";
import { buildConcatScenesCommand, buildEncodeMp4Command } from "./ffmpeg-command-builder.js";
import { buildConcatManifestContent, writeConcatManifest } from "./concat-manifest.js";
import { validateMp4Output } from "./mp4-output-validator.js";

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-ffmpeg-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("buildEncodeMp4Command", () => {
  it("builds an image sequence encode command with no audio", () => {
    const command = buildEncodeMp4Command({
      videoInput: {
        kind: "image_sequence",
        framePattern: "frames/%06d.png",
        fps: 30
      },
      outputPath: "output/video.mp4",
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 5
    });

    expect(command.executablePath).toBe("ffmpeg");
    expect(command.args).toContain("-framerate");
    expect(command.args).toContain("frames/%06d.png");
    expect(command.args).toContain("-an");
    expect(command.args).toContain("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p");
    expect(command.args).toContain("libx264");
    expect(command.args.at(-1)).toBe("output/video.mp4");
  });

  it("builds single audio track switches", () => {
    const command = buildEncodeMp4Command({
      videoInput: {
        kind: "video_file",
        inputPath: "scene.mp4"
      },
      outputPath: "output/video.mp4",
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 5,
      audioTracks: [
        {
          id: "voice",
          path: "voice.wav"
        }
      ]
    });

    expect(command.args).toContain("voice.wav");
    expect(command.args).toContain("-map");
    expect(command.args).toContain("1:a:0");
    expect(command.args).toContain("-shortest");
  });

  it("builds multi-track amix switches", () => {
    const command = buildEncodeMp4Command({
      videoInput: {
        kind: "video_file",
        inputPath: "scene.mp4"
      },
      outputPath: "output/video.mp4",
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 5,
      audioTracks: [
        {
          id: "voice",
          path: "voice.wav",
          volume: 1
        },
        {
          id: "music",
          path: "music.wav",
          volume: 0.25
        }
      ]
    });

    expect(command.args).toContain("-filter_complex");
    expect(command.args).toContain("[1:a:0]volume=1[a0];[2:a:0]volume=0.25[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[aout]");
    expect(command.args).toContain("[aout]");
  });

  it("builds timed audio filter switches", () => {
    const command = buildEncodeMp4Command({
      videoInput: {
        kind: "video_file",
        inputPath: "scene.mp4"
      },
      outputPath: "output/video.mp4",
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 10,
      audioTracks: [
        {
          id: "voice-scene-2",
          path: "voice-scene-2.wav",
          startSeconds: 4,
          durationSeconds: 3,
          volume: 0.9
        },
        {
          id: "music",
          path: "music.wav",
          durationSeconds: 10,
          loop: true,
          volume: 0.25
        }
      ]
    });

    expect(command.args).toContain("-stream_loop");
    expect(command.args).toContain("-filter_complex");
    expect(command.args).toContain(
      "[1:a:0]atrim=0:3,asetpts=PTS-STARTPTS,adelay=4000:all=1,volume=0.9[a0];[2:a:0]atrim=0:10,asetpts=PTS-STARTPTS,volume=0.25[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[aout]"
    );
  });

  it("rejects duplicate audio track ids", () => {
    expect(() =>
      buildEncodeMp4Command({
        videoInput: {
          kind: "video_file",
          inputPath: "scene.mp4"
        },
        outputPath: "output/video.mp4",
        width: 1080,
        height: 1920,
        fps: 30,
        durationSeconds: 5,
        audioTracks: [
          {
            id: "voice",
            path: "voice.wav"
          },
          {
            id: "voice",
            path: "voice-2.wav"
          }
        ]
      })
    ).toThrow(/ENCODER-AUDIO-001/);
  });

  it("rejects invalid timed audio tracks", () => {
    expect(() =>
      buildEncodeMp4Command({
        videoInput: {
          kind: "video_file",
          inputPath: "scene.mp4"
        },
        outputPath: "output/video.mp4",
        width: 1080,
        height: 1920,
        fps: 30,
        durationSeconds: 5,
        audioTracks: [
          {
            id: "late-voice",
            path: "voice.wav",
            startSeconds: 5
          }
        ]
      })
    ).toThrow(/ENCODER-AUDIO-001/);
  });
});

describe("concat scene commands", () => {
  it("writes concat manifest with escaped paths", async () => {
    const manifestPath = path.join(tempRoot, "concat.txt");
    await writeConcatManifest(manifestPath, ["scene-one.mp4", "folder/scene's two.mp4"]);

    expect(readFileSync(manifestPath, "utf8")).toBe("file 'scene-one.mp4'\nfile 'folder/scene'\\''s two.mp4'\n");
  });

  it("builds concat demuxer command", () => {
    const command = buildConcatScenesCommand({
      sceneVideoPaths: ["a.mp4", "b.mp4"],
      manifestPath: "concat.txt",
      outputPath: "output.mp4"
    });

    expect(buildConcatManifestContent(["a.mp4", "b.mp4"])).toBe("file 'a.mp4'\nfile 'b.mp4'\n");
    expect(command.args).toEqual(["-y", "-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
  });
});

describe("validateMp4Output", () => {
  it("accepts valid ffprobe metadata", async () => {
    const runner = fakeRunner(
      JSON.stringify({
        streams: [
          {
            codec_type: "video",
            width: 1080,
            height: 1920,
            duration: "5.000000"
          }
        ],
        format: {
          format_name: "mov,mp4,m4a,3gp,3g2,mj2",
          duration: "5.000000"
        }
      })
    );

    await expect(
      validateMp4Output({
        filePath: "output.mp4",
        runner
      })
    ).resolves.toEqual({
      ok: true,
      metadata: {
        width: 1080,
        height: 1920,
        durationSeconds: 5,
        formatName: "mov,mp4,m4a,3gp,3g2,mj2"
      }
    });
  });

  it("rejects invalid dimensions, duration and format", async () => {
    const runner = fakeRunner(
      JSON.stringify({
        streams: [
          {
            codec_type: "video",
            width: 1920,
            height: 1080
          }
        ],
        format: {
          format_name: "matroska,webm",
          duration: "60.000000"
        }
      })
    );

    const result = await validateMp4Output({
      filePath: "output.webm",
      runner
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ code: "OUTPUT-VALIDATION-001", path: "/streams/0/width" }),
        expect.objectContaining({ code: "OUTPUT-VALIDATION-001", path: "/streams/0/height" }),
        expect.objectContaining({ code: "OUTPUT-VALIDATION-001", path: "/format/duration" }),
        expect.objectContaining({ code: "OUTPUT-VALIDATION-001", path: "/format/format_name" })
      ]);
    }
  });

  it("returns a validation issue when ffprobe fails", async () => {
    const runner: ProcessRunner = {
      run: async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "file not found"
      })
    };

    const result = await validateMp4Output({
      filePath: "missing.mp4",
      runner
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({
        code: "OUTPUT-VALIDATION-001",
        path: "/"
      });
    }
  });
});

function fakeRunner(stdout: string): ProcessRunner {
  return {
    run: async (command) => {
      expect(command.executablePath).toBe("ffprobe");
      expect(command.args).toContain("-show_streams");
      return {
        exitCode: 0,
        stdout,
        stderr: ""
      };
    }
  };
}
