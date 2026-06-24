import type { FfmpegCommand, Mp4ValidationIssue, Mp4ValidationResult, ProcessRunner } from "@ovaf/contracts";

const DEFAULT_FFPROBE_PATH = "ffprobe";

export interface ValidateMp4OutputOptions {
  readonly filePath: string;
  readonly ffprobePath?: string;
  readonly expectedWidth?: 1080;
  readonly expectedHeight?: 1920;
  readonly maxDurationSeconds?: number;
  readonly runner: ProcessRunner;
}

export async function validateMp4Output(options: ValidateMp4OutputOptions): Promise<Mp4ValidationResult> {
  const command: FfmpegCommand = {
    executablePath: options.ffprobePath ?? DEFAULT_FFPROBE_PATH,
    args: ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", options.filePath]
  };
  const result = await options.runner.run(command);

  if (result.exitCode !== 0) {
    return failure("/", `ffprobe failed with exit code ${result.exitCode}: ${result.stderr}`);
  }

  const parsed = parseProbeOutput(result.stdout);
  if (parsed === null) {
    return failure("/", "ffprobe output was not valid JSON metadata.");
  }

  const videoStream = findVideoStream(parsed);
  if (videoStream === null) {
    return failure("/streams", "No video stream found in MP4 output.");
  }

  const durationSeconds = getDurationSeconds(parsed, videoStream);
  const width = readNumber(videoStream.width);
  const height = readNumber(videoStream.height);
  const formatName = readString(parsed.format?.format_name) ?? "";
  const issues: Mp4ValidationIssue[] = [];
  const expectedWidth = options.expectedWidth ?? 1080;
  const expectedHeight = options.expectedHeight ?? 1920;
  const maxDurationSeconds = options.maxDurationSeconds ?? 60;

  if (width !== expectedWidth) {
    issues.push(issue("/streams/0/width", `Expected width ${expectedWidth}, got ${width ?? "unknown"}.`));
  }

  if (height !== expectedHeight) {
    issues.push(issue("/streams/0/height", `Expected height ${expectedHeight}, got ${height ?? "unknown"}.`));
  }

  if (durationSeconds === null || durationSeconds >= maxDurationSeconds) {
    issues.push(issue("/format/duration", `Expected duration under ${maxDurationSeconds}s, got ${durationSeconds ?? "unknown"}.`));
  }

  if (!isMp4LikeFormat(formatName)) {
    issues.push(issue("/format/format_name", `Expected MP4-like format, got '${formatName || "unknown"}'.`));
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  return {
    ok: true,
    metadata: {
      width: width ?? expectedWidth,
      height: height ?? expectedHeight,
      durationSeconds: durationSeconds ?? 0,
      formatName
    }
  };
}

interface ProbeOutput {
  readonly streams?: readonly ProbeStream[];
  readonly format?: {
    readonly format_name?: unknown;
    readonly duration?: unknown;
  };
}

interface ProbeStream {
  readonly codec_type?: unknown;
  readonly width?: unknown;
  readonly height?: unknown;
  readonly duration?: unknown;
}

function parseProbeOutput(stdout: string): ProbeOutput | null {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    return isRecord(parsed) ? (parsed as ProbeOutput) : null;
  } catch {
    return null;
  }
}

function findVideoStream(output: ProbeOutput): ProbeStream | null {
  return output.streams?.find((stream) => stream.codec_type === "video") ?? null;
}

function getDurationSeconds(output: ProbeOutput, stream: ProbeStream): number | null {
  return readNumericString(output.format?.duration) ?? readNumericString(stream.duration);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumericString(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMp4LikeFormat(formatName: string): boolean {
  return formatName.split(",").some((format) => format === "mp4" || format === "mov" || format === "m4a" || format === "3gp" || format === "3g2" || format === "mj2");
}

function failure(path: string, technicalDetails: string): Mp4ValidationResult {
  return {
    ok: false,
    issues: [issue(path, technicalDetails)]
  };
}

function issue(path: string, technicalDetails: string): Mp4ValidationIssue {
  return {
    code: "OUTPUT-VALIDATION-001",
    path,
    humanReadableMessage: "Encoded MP4 output did not pass validation.",
    technicalDetails
  };
}
