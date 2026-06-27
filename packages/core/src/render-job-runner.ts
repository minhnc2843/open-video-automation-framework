import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { buildConcatScenesCommand, buildEncodeMp4Command, nodeProcessRunner, validateMp4Output, writeConcatManifest } from "@ovaf/encoder-ffmpeg";
import type {
  FfmpegCommand,
  FrameworkErrorCode,
  JobStatus,
  JsonObject,
  JsonScript,
  Mp4ValidationSuccess,
  PipelineStage,
  ProcessRunner,
  StructuredLogRecord
} from "@ovaf/contracts";
import { JsonlLogger } from "@ovaf/logger";
import { captureSceneFrames } from "@ovaf/renderer-html";
import { buildTimeline } from "@ovaf/timeline";
import { validateJsonScript } from "@ovaf/validator";
import { chromium } from "playwright-core";

export interface RenderJobProgress {
  readonly currentStage: string;
  readonly completedScenes: number;
  readonly totalScenes: number;
  readonly percent: number;
  readonly status: JobStatus;
  readonly stage?: PipelineStage;
  readonly sceneId?: string;
  readonly sceneIndex?: number;
}

export interface RenderJobInput {
  readonly jobId: string;
  readonly projectId: string;
  readonly projectVersionId?: string;
  readonly script: JsonScript;
  readonly storageRoot: string;
  readonly outputFileName?: string;
  readonly onProgress?: (progress: RenderJobProgress) => Promise<void> | void;
  readonly chromiumExecutablePath?: string;
  readonly ffmpegPath?: string;
  readonly ffprobePath?: string;
  readonly runner?: ProcessRunner;
  readonly now?: () => Date;
}

export interface RenderJobPaths {
  readonly storageRoot: string;
  readonly outputDir: string;
  readonly logsDir: string;
  readonly tempDir: string;
  readonly jobTempDir: string;
  readonly logPath: string;
  readonly outputPath: string;
}

export type RenderJobResult =
  | {
      readonly ok: true;
      readonly outputPath: string;
      readonly logPath: string;
      readonly metadata: {
        readonly width: number;
        readonly height: number;
        readonly fps: number;
        readonly durationSeconds: number;
      };
    }
  | {
      readonly ok: false;
      readonly logPath: string;
      readonly outputPath: string;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly technicalDetails?: unknown;
      };
    };

export function buildRenderJobPaths(input: {
  readonly jobId: string;
  readonly storageRoot: string;
  readonly outputFileName?: string;
}): RenderJobPaths {
  const storageRoot = path.resolve(input.storageRoot);
  const outputDir = path.join(storageRoot, "output");
  const logsDir = path.join(storageRoot, "logs");
  const tempDir = path.join(storageRoot, "temp");
  const safeJobId = safeId(input.jobId);

  return {
    storageRoot,
    outputDir,
    logsDir,
    tempDir,
    jobTempDir: path.join(tempDir, "render-jobs", safeJobId),
    logPath: path.join(logsDir, `${safeJobId}.jsonl`),
    outputPath: path.join(outputDir, input.outputFileName ?? `${safeJobId}.mp4`)
  };
}

export async function runRenderJob(input: RenderJobInput): Promise<RenderJobResult> {
  const now = input.now ?? (() => new Date());
  const startedAt = performance.now();
  const paths = buildRenderJobPaths(input);
  const runner = input.runner ?? nodeProcessRunner;
  const logger = new JsonlLogger({ logPath: paths.logPath });

  try {
    await mkdir(paths.outputDir, { recursive: true });
    await mkdir(paths.logsDir, { recursive: true });
    await mkdir(paths.jobTempDir, { recursive: true });

    await writeLog(logger, input, now, {
      humanReadableMessage: "Render job started.",
      level: "info",
      stage: "script_imported",
      status: "started",
      technicalDetails: {
        outputPath: paths.outputPath,
        storageRoot: paths.storageRoot
      }
    });

    await reportProgress(input, {
      completedScenes: 0,
      currentStage: "validating",
      percent: 5,
      stage: "validation",
      status: "validating",
      totalScenes: 0
    });

    const validation = validateJsonScript(input.script);
    if (!validation.ok) {
      const firstIssue = validation.issues[0];
      await writeLog(logger, input, now, {
        ...(firstIssue === undefined ? {} : { errorCode: firstIssue.code }),
        humanReadableMessage: "JSON Script validation failed.",
        level: "error",
        stage: "validation",
        status: "failed",
        technicalDetails: {
          issues: toJsonValue(validation.issues)
        }
      });
      return failure(paths, firstIssue?.code ?? "SCRIPT-SCHEMA-001", "JSON Script validation failed.", validation.issues);
    }

    await writeLog(logger, input, now, {
      humanReadableMessage: "JSON Script validation passed.",
      level: "info",
      stage: "validation",
      status: "completed"
    });

    const timelineResult = buildTimeline(validation.script);
    if (!timelineResult.ok) {
      const firstIssue = timelineResult.issues[0];
      await writeLog(logger, input, now, {
        ...(firstIssue === undefined ? {} : { errorCode: firstIssue.code }),
        humanReadableMessage: "Timeline build failed.",
        level: "error",
        stage: "timeline_build",
        status: "failed",
        technicalDetails: {
          issues: toJsonValue(timelineResult.issues)
        }
      });
      return failure(paths, firstIssue?.code ?? "TIMELINE-TIME-003", "Timeline build failed.", timelineResult.issues);
    }

    const timeline = timelineResult.timeline;
    await reportProgress(input, {
      completedScenes: 0,
      currentStage: "timeline_build",
      percent: 10,
      stage: "timeline_build",
      status: "preparing",
      totalScenes: timeline.scenes.length
    });
    await writeLog(logger, input, now, {
      humanReadableMessage: "Timeline build completed.",
      level: "info",
      stage: "timeline_build",
      status: "completed",
      technicalDetails: {
        durationSeconds: timeline.durationSeconds,
        scenes: timeline.scenes.length
      }
    });

    const browserExecutablePath = input.chromiumExecutablePath ?? (await resolveChromiumExecutablePath());
    await writeLog(logger, input, now, {
      humanReadableMessage: "Chromium executable resolved.",
      level: "info",
      stage: "frame_capture",
      status: "ready",
      technicalDetails: { browserExecutablePath }
    });

    const sceneVideoPaths: string[] = [];
    for (const scene of timeline.scenes) {
      const sceneStartedAt = performance.now();
      const sceneNumber = scene.index + 1;
      const sceneFrameDirectory = path.join(paths.jobTempDir, "frames", `${String(sceneNumber).padStart(3, "0")}-${safeId(scene.id)}`);
      const sceneVideoPath = path.join(paths.jobTempDir, `${String(sceneNumber).padStart(3, "0")}-${safeId(scene.id)}.mp4`);

      await reportProgress(input, {
        completedScenes: scene.index,
        currentStage: `rendering_scene_${sceneNumber}_of_${timeline.scenes.length}`,
        percent: scenePercent(scene.index, 0, timeline.scenes.length),
        sceneId: scene.id,
        sceneIndex: sceneNumber,
        stage: "scene_render",
        status: "rendering",
        totalScenes: timeline.scenes.length
      });
      await writeLog(logger, input, now, {
        humanReadableMessage: "Scene render started.",
        level: "info",
        sceneId: scene.id,
        stage: "scene_render",
        status: "started",
        technicalDetails: {
          durationFrames: scene.durationFrames,
          durationSeconds: scene.durationSeconds,
          fps: timeline.settings.fps,
          frameDirectory: sceneFrameDirectory
        }
      });

      const frameDirectoryExists = await pathExists(sceneFrameDirectory);
      await writeLog(logger, input, now, {
        humanReadableMessage: "Scene frame cache decision.",
        level: "info",
        sceneId: scene.id,
        stage: "scene_render",
        status: frameDirectoryExists ? "cache_bypass" : "cache_miss",
        technicalDetails: {
          frameDirectory: sceneFrameDirectory,
          reason: "Frame directories are scoped to a render job and regenerated for deterministic output."
        }
      });

      if (scene.transition?.name === "fade") {
        await writeLog(logger, input, now, {
          humanReadableMessage: "Fade transition uses scene-level fade-in and fade-out in the current concat pipeline.",
          level: "warn",
          sceneId: scene.id,
          stage: "scene_render",
          status: "capability_limit",
          technicalDetails: {
            limitation: "Overlapping crossfade between scene MP4 files is not implemented in this phase.",
            transition: toJsonValue(scene.transition)
          }
        });
      }

      await writeLog(logger, input, now, {
        humanReadableMessage: "Frame capture started.",
        level: "info",
        sceneId: scene.id,
        stage: "frame_capture",
        status: "started",
        technicalDetails: {
          frameDirectory: sceneFrameDirectory,
          totalFrames: scene.durationFrames
        }
      });

      const frameCapture = await captureSceneFrames(
        {
          fps: timeline.settings.fps,
          height: timeline.settings.height,
          scene,
          width: timeline.settings.width
        },
        {
          executablePath: browserExecutablePath,
          outputDirectory: sceneFrameDirectory,
          progressIntervalFrames: Math.max(1, timeline.settings.fps),
          onProgress: async (progress) => {
            await reportProgress(input, {
              completedScenes: scene.index,
              currentStage: `rendering_scene_${sceneNumber}_of_${timeline.scenes.length}`,
              percent: scenePercent(scene.index, progress.capturedFrames / progress.totalFrames, timeline.scenes.length),
              sceneId: scene.id,
              sceneIndex: sceneNumber,
              stage: "frame_capture",
              status: "rendering",
              totalScenes: timeline.scenes.length
            });
            await writeLog(logger, input, now, {
              humanReadableMessage: "Frame capture progress.",
              level: "info",
              sceneId: scene.id,
              stage: "frame_capture",
              status: "progress",
              technicalDetails: {
                capturedFrames: progress.capturedFrames,
                frameIndex: progress.frameIndex,
                timeMs: Number(progress.timeMs.toFixed(3)),
                totalFrames: progress.totalFrames
              }
            });
          }
        }
      );

      await writeLog(logger, input, now, {
        durationMs: elapsedMs(sceneStartedAt),
        humanReadableMessage: "Frame capture complete.",
        level: "info",
        sceneId: scene.id,
        stage: "frame_capture",
        status: "completed",
        technicalDetails: {
          firstFramePath: frameCapture.firstFramePath,
          frameCount: frameCapture.frameCount,
          frameDirectory: frameCapture.frameDirectory,
          framePattern: frameCapture.framePattern,
          lastFramePath: frameCapture.lastFramePath
        }
      });

      const encodeSceneCommand = buildEncodeMp4Command({
        durationSeconds: scene.durationSeconds,
        fps: timeline.settings.fps,
        height: timeline.settings.height,
        outputPath: sceneVideoPath,
        videoInput: {
          kind: "image_sequence",
          framePattern: frameCapture.framePattern,
          fps: timeline.settings.fps
        },
        width: timeline.settings.width,
        ...(input.ffmpegPath === undefined ? {} : { ffmpegPath: input.ffmpegPath })
      });
      await runFfmpegCommand(encodeSceneCommand, runner, logger, input, now, {
        sceneId: scene.id,
        stage: "ffmpeg_encode",
        successMessage: "Scene clip encoded."
      });
      sceneVideoPaths.push(sceneVideoPath);

      await reportProgress(input, {
        completedScenes: scene.index + 1,
        currentStage: `rendering_scene_${sceneNumber}_of_${timeline.scenes.length}`,
        percent: scenePercent(scene.index + 1, 0, timeline.scenes.length),
        sceneId: scene.id,
        sceneIndex: sceneNumber,
        stage: "scene_render",
        status: "rendering",
        totalScenes: timeline.scenes.length
      });
    }

    await reportProgress(input, {
      completedScenes: timeline.scenes.length,
      currentStage: "encoding",
      percent: 85,
      stage: "video_export",
      status: "encoding",
      totalScenes: timeline.scenes.length
    });
    const manifestPath = path.join(paths.jobTempDir, "concat.txt");
    await writeConcatManifest(manifestPath, sceneVideoPaths);
    const concatCommand = buildConcatScenesCommand({
      manifestPath,
      outputPath: paths.outputPath,
      sceneVideoPaths,
      ...(input.ffmpegPath === undefined ? {} : { ffmpegPath: input.ffmpegPath })
    });
    await runFfmpegCommand(concatCommand, runner, logger, input, now, {
      stage: "video_export",
      successMessage: "Final MP4 concatenated."
    });

    await reportProgress(input, {
      completedScenes: timeline.scenes.length,
      currentStage: "validating_output",
      percent: 95,
      stage: "output_validation",
      status: "validating_output",
      totalScenes: timeline.scenes.length
    });
    const validationResult = await validateMp4Output({
      expectedHeight: timeline.settings.height,
      expectedWidth: timeline.settings.width,
      filePath: paths.outputPath,
      runner,
      ...(input.ffprobePath === undefined ? {} : { ffprobePath: input.ffprobePath })
    });
    if (!validationResult.ok) {
      const firstIssue = validationResult.issues[0];
      await writeLog(logger, input, now, {
        ...(firstIssue === undefined ? {} : { errorCode: firstIssue.code }),
        humanReadableMessage: "MP4 output validation failed.",
        level: "error",
        stage: "output_validation",
        status: "failed",
        technicalDetails: { issues: toJsonValue(validationResult.issues) }
      });
      return failure(paths, firstIssue?.code ?? "OUTPUT-VALIDATION-001", "MP4 output validation failed.", validationResult.issues);
    }

    await assertFileExists(paths.outputPath, `Output MP4 does not exist after validation: ${paths.outputPath}`);
    const metadata = toRenderMetadata(validationResult, timeline.settings.fps);
    await writeLog(logger, input, now, {
      durationMs: elapsedMs(startedAt),
      humanReadableMessage: "Render job completed.",
      level: "info",
      stage: "output_validation",
      status: "completed",
      technicalDetails: {
        logPath: paths.logPath,
        metadata,
        outputPath: paths.outputPath
      }
    });
    await reportProgress(input, {
      completedScenes: timeline.scenes.length,
      currentStage: "completed",
      percent: 100,
      stage: "output_validation",
      status: "completed",
      totalScenes: timeline.scenes.length
    });

    return {
      ok: true,
      logPath: paths.logPath,
      metadata,
      outputPath: paths.outputPath
    };
  } catch (caughtError) {
    const normalized = normalizeError(caughtError);
    try {
      await writeLog(logger, input, now, {
        durationMs: elapsedMs(startedAt),
        errorCode: normalized.logCode,
        humanReadableMessage: normalized.message,
        level: "error",
        stage: "output_validation",
        status: "failed",
        technicalDetails: {
          errorMessage: normalized.technicalDetails
        }
      });
    } catch (logError) {
      return failure(paths, normalized.code, normalized.message, {
        errorMessage: normalized.technicalDetails,
        logWriteError: logError instanceof Error ? logError.message : String(logError)
      });
    }

    return failure(paths, normalized.code, normalized.message, normalized.technicalDetails);
  }
}

async function reportProgress(input: RenderJobInput, progress: RenderJobProgress): Promise<void> {
  await input.onProgress?.({
    ...progress,
    percent: Math.max(0, Math.min(100, Number(progress.percent.toFixed(2))))
  });
}

async function writeLog(
  logger: JsonlLogger,
  input: RenderJobInput,
  now: () => Date,
  record: Omit<StructuredLogRecord, "jobId" | "projectId" | "projectVersionId" | "timestamp">
): Promise<void> {
  await logger.write({
    timestamp: now().toISOString(),
    jobId: input.jobId,
    projectId: input.projectId,
    ...(input.projectVersionId === undefined ? {} : { projectVersionId: input.projectVersionId }),
    ...record
  });
}

async function runFfmpegCommand(
  command: FfmpegCommand,
  runner: ProcessRunner,
  logger: JsonlLogger,
  input: RenderJobInput,
  now: () => Date,
  context: {
    readonly sceneId?: string;
    readonly stage: PipelineStage;
    readonly successMessage: string;
  }
): Promise<void> {
  const startedAt = performance.now();
  await writeLog(logger, input, now, {
    humanReadableMessage: "FFmpeg command started.",
    level: "info",
    ...(context.sceneId === undefined ? {} : { sceneId: context.sceneId }),
    stage: context.stage,
    status: "started",
    technicalDetails: {
      args: [...command.args],
      executablePath: command.executablePath
    }
  });

  const result = await runner.run(command);
  if (result.exitCode !== 0) {
    await writeLog(logger, input, now, {
      durationMs: elapsedMs(startedAt),
      errorCode: "ENCODER-FFMPEG-001",
      humanReadableMessage: "FFmpeg command failed.",
      level: "error",
      ...(context.sceneId === undefined ? {} : { sceneId: context.sceneId }),
      stage: context.stage,
      status: "failed",
      technicalDetails: {
        stderr: result.stderr.slice(-4000),
        stdout: result.stdout.slice(-4000)
      }
    });
    throw new Error(`ENCODER-FFMPEG-001: FFmpeg command failed with exit code ${result.exitCode}: ${result.stderr.slice(-1000)}`);
  }

  await writeLog(logger, input, now, {
    durationMs: elapsedMs(startedAt),
    humanReadableMessage: context.successMessage,
    level: "info",
    ...(context.sceneId === undefined ? {} : { sceneId: context.sceneId }),
    stage: context.stage,
    status: "completed"
  });
}

async function resolveChromiumExecutablePath(): Promise<string> {
  const configuredPath = process.env.CHROMIUM_PATH?.trim();
  if (configuredPath !== undefined && configuredPath.length > 0) {
    const resolved = path.resolve(configuredPath);
    await assertFileExists(resolved, `CHROMIUM_PATH does not point to an existing executable: ${resolved}`);
    return resolved;
  }

  const executablePath = chromium.executablePath();
  await assertFileExists(
    executablePath,
    `Playwright Chromium executable was not found at ${executablePath}. Run npx playwright install chromium. On Colab, run npx playwright install-deps chromium first if system dependencies are missing.`
  );
  return executablePath;
}

async function assertFileExists(filePath: string, message: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function scenePercent(completedScenes: number, partialSceneProgress: number, totalScenes: number): number {
  if (totalScenes <= 0) {
    return 10;
  }

  return 10 + ((completedScenes + partialSceneProgress) / totalScenes) * 60;
}

function toRenderMetadata(
  validationResult: Mp4ValidationSuccess,
  fps: number
): {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationSeconds: number;
} {
  return {
    width: validationResult.metadata.width,
    height: validationResult.metadata.height,
    fps,
    durationSeconds: validationResult.metadata.durationSeconds
  };
}

function failure(
  paths: RenderJobPaths,
  code: string,
  message: string,
  technicalDetails?: unknown
): RenderJobResult {
  return {
    ok: false,
    logPath: paths.logPath,
    outputPath: paths.outputPath,
    error: {
      code,
      message,
      ...(technicalDetails === undefined ? {} : { technicalDetails })
    }
  };
}

function normalizeError(error: unknown): { readonly code: string; readonly logCode: FrameworkErrorCode; readonly message: string; readonly technicalDetails: string } {
  const message = error instanceof Error ? error.message : String(error);
  const codeMatch = /^(?<code>[A-Z]+(?:-[A-Z]+)*-\d{3}):/u.exec(message);
  const code = codeMatch?.groups?.code ?? "RENDERER-CAPTURE-001";

  return {
    code,
    logCode: toFrameworkErrorCode(code),
    message: "Render job failed before producing a valid MP4.",
    technicalDetails: message
  };
}

function toFrameworkErrorCode(code: string): FrameworkErrorCode {
  if (code === "ENCODER-FFMPEG-001") {
    return "ENCODER-FFMPEG-001";
  }

  if (code === "OUTPUT-VALIDATION-001") {
    return "OUTPUT-VALIDATION-001";
  }

  if (code === "SCRIPT-SCHEMA-001") {
    return "SCRIPT-SCHEMA-001";
  }

  if (code === "TIMELINE-TIME-003") {
    return "TIMELINE-TIME-003";
  }

  return "RENDERER-CAPTURE-001";
}

function toJsonValue(value: unknown): JsonObject {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    return { value: String(value) };
  }

  const parsed = JSON.parse(serialized) as unknown;
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : { value: parsed as JsonObject[keyof JsonObject] };
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "render";
}

function elapsedMs(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(3));
}
