import type { FrameworkErrorCode } from "./errors.js";

export interface FfmpegCommand {
  readonly executablePath: string;
  readonly args: readonly string[];
}

export type VideoEncodeInput =
  | {
      readonly kind: "image_sequence";
      readonly framePattern: string;
      readonly fps: number;
    }
  | {
      readonly kind: "video_file";
      readonly inputPath: string;
    };

export interface AudioTrackInput {
  readonly id: string;
  readonly path: string;
  readonly volume?: number;
}

export interface EncodeMp4Input {
  readonly videoInput: VideoEncodeInput;
  readonly outputPath: string;
  readonly width: 1080;
  readonly height: 1920;
  readonly fps: number;
  readonly durationSeconds: number;
  readonly audioTracks?: readonly AudioTrackInput[];
  readonly ffmpegPath?: string;
}

export interface ConcatScenesInput {
  readonly sceneVideoPaths: readonly string[];
  readonly manifestPath: string;
  readonly outputPath: string;
  readonly ffmpegPath?: string;
}

export interface ProcessRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ProcessRunner {
  readonly run: (command: FfmpegCommand) => Promise<ProcessRunResult>;
}

export interface Mp4ValidationIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
}

export interface Mp4ValidationSuccess {
  readonly ok: true;
  readonly metadata: {
    readonly width: number;
    readonly height: number;
    readonly durationSeconds: number;
    readonly formatName: string;
  };
}

export interface Mp4ValidationFailure {
  readonly ok: false;
  readonly issues: readonly Mp4ValidationIssue[];
}

export type Mp4ValidationResult = Mp4ValidationSuccess | Mp4ValidationFailure;
