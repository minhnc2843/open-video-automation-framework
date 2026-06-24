import type { AudioTrackInput, ConcatScenesInput, EncodeMp4Input, FfmpegCommand } from "@ovaf/contracts";

const DEFAULT_FFMPEG_PATH = "ffmpeg";
const VIDEO_FILTER = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps={fps},format=yuv420p";

export function buildEncodeMp4Command(input: EncodeMp4Input): FfmpegCommand {
  validateAudioTracks(input.audioTracks ?? []);

  const args: string[] = ["-y"];

  if (input.videoInput.kind === "image_sequence") {
    args.push("-framerate", String(input.videoInput.fps), "-i", input.videoInput.framePattern);
  } else {
    args.push("-i", input.videoInput.inputPath);
  }

  for (const track of input.audioTracks ?? []) {
    args.push("-i", track.path);
  }

  args.push("-map", "0:v:0");
  addAudioArgs(args, input.audioTracks ?? []);
  args.push(
    "-vf",
    VIDEO_FILTER.replace("{fps}", String(input.fps)),
    "-t",
    formatSeconds(input.durationSeconds),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    input.outputPath
  );

  return {
    executablePath: input.ffmpegPath ?? DEFAULT_FFMPEG_PATH,
    args
  };
}

export function buildConcatScenesCommand(input: ConcatScenesInput): FfmpegCommand {
  return {
    executablePath: input.ffmpegPath ?? DEFAULT_FFMPEG_PATH,
    args: ["-y", "-f", "concat", "-safe", "0", "-i", input.manifestPath, "-c", "copy", input.outputPath]
  };
}

function addAudioArgs(args: string[], audioTracks: readonly AudioTrackInput[]): void {
  if (audioTracks.length === 0) {
    args.push("-an");
    return;
  }

  if (audioTracks.length === 1) {
    args.push("-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest");
    return;
  }

  const filters = audioTracks
    .map((track, index) => `[${index + 1}:a:0]volume=${formatVolume(track.volume ?? 1)}[a${index}]`)
    .join(";");
  const inputs = audioTracks.map((_, index) => `[a${index}]`).join("");
  args.push(
    "-filter_complex",
    `${filters};${inputs}amix=inputs=${audioTracks.length}:duration=longest:dropout_transition=0[aout]`,
    "-map",
    "[aout]",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest"
  );
}

function validateAudioTracks(audioTracks: readonly AudioTrackInput[]): void {
  const ids = new Set<string>();
  for (const track of audioTracks) {
    if (ids.has(track.id)) {
      throw new Error(`ENCODER-AUDIO-001: duplicate audio track id '${track.id}'.`);
    }
    ids.add(track.id);

    if (track.volume !== undefined && (track.volume < 0 || track.volume > 2)) {
      throw new Error(`ENCODER-AUDIO-001: audio track volume must be between 0 and 2.`);
    }
  }
}

function formatSeconds(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function formatVolume(value: number): string {
  return Number(value.toFixed(3)).toString();
}
