#!/usr/bin/env node
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

const root = process.cwd();
const DIST_REQUIREMENTS = [
  "packages/validator/dist/index.js",
  "packages/timeline/dist/index.js",
  "packages/renderer-html/dist/index.js",
  "packages/encoder-ffmpeg/dist/index.js",
  "packages/logger/dist/index.js"
];

async function main() {
  const inputArg = process.argv[2];
  if (inputArg === undefined || inputArg.trim().length === 0) {
    throw new Error("Usage: npm run render -- <json-script-path>");
  }

  const inputPath = path.resolve(root, inputArg);
  await assertFileExists(inputPath, `Input JSON Script does not exist: ${inputPath}`);
  await ensureBuiltPackages();

  const [
    { validateJsonScript },
    { buildTimeline },
    { captureSceneFrames },
    {
      buildEncodeMp4Command,
      buildConcatScenesCommand,
      nodeProcessRunner,
      validateMp4Output,
      writeConcatManifest
    },
    { JsonlLogger }
  ] = await Promise.all([
    import("../packages/validator/dist/index.js"),
    import("../packages/timeline/dist/index.js"),
    import("../packages/renderer-html/dist/index.js"),
    import("../packages/encoder-ffmpeg/dist/index.js"),
    import("../packages/logger/dist/index.js")
  ]);

  const storageRoot = path.resolve(root, process.env.OVAF_STORAGE_ROOT ?? "storage");
  const outputDir = path.join(storageRoot, "output");
  const logsDir = path.join(storageRoot, "logs");
  const tempDir = path.join(storageRoot, "temp");
  const inputBaseName = path.basename(inputPath, path.extname(inputPath));
  const jobId = `render-${safeId(inputBaseName)}-${new Date().toISOString().replace(/[-:.TZ]/gu, "")}-${randomUUID().slice(0, 8)}`;
  const jobTempDir = path.join(tempDir, "render-jobs", jobId);
  const logPath = path.join(logsDir, `${jobId}.jsonl`);
  const outputPath = path.join(outputDir, `${inputBaseName}.mp4`);
  const logger = new JsonlLogger({ logPath });
  const writeLog = (record) =>
    logger.write({
      timestamp: new Date().toISOString(),
      jobId,
      ...record
    });

  await mkdir(outputDir, { recursive: true });
  await mkdir(logsDir, { recursive: true });
  await mkdir(jobTempDir, { recursive: true });

  const startedAt = performance.now();
  await writeLog({
    humanReadableMessage: "Render job started.",
    level: "info",
    stage: "script_imported",
    status: "started",
    technicalDetails: {
      inputPath,
      outputPath,
      storageRoot
    }
  });

  const scriptRaw = await readFile(inputPath, "utf8");
  const script = parseJson(scriptRaw, inputPath);

  const validation = validateJsonScript(script);
  if (!validation.ok) {
    await writeLog({
      errorCode: validation.issues[0]?.code,
      humanReadableMessage: "JSON Script validation failed.",
      level: "error",
      stage: "validation",
      status: "failed",
      technicalDetails: { issues: validation.issues }
    });
    throw new Error(`JSON Script validation failed: ${validation.issues[0]?.technicalDetails ?? "unknown validation issue"}`);
  }
  await writeLog({
    humanReadableMessage: "JSON Script validation passed.",
    level: "info",
    stage: "validation",
    status: "completed"
  });

  const timelineResult = buildTimeline(validation.script);
  if (!timelineResult.ok) {
    await writeLog({
      errorCode: timelineResult.issues[0]?.code,
      humanReadableMessage: "Timeline build failed.",
      level: "error",
      stage: "timeline_build",
      status: "failed",
      technicalDetails: { issues: timelineResult.issues }
    });
    throw new Error(`Timeline build failed: ${timelineResult.issues[0]?.technicalDetails ?? "unknown timeline issue"}`);
  }

  const timeline = timelineResult.timeline;
  await writeLog({
    humanReadableMessage: "Timeline build completed.",
    level: "info",
    stage: "timeline_build",
    status: "completed",
    technicalDetails: {
      durationSeconds: timeline.durationSeconds,
      scenes: timeline.scenes.length
    }
  });

  const browserExecutablePath = await resolveChromiumExecutablePath();
  await writeLog({
    humanReadableMessage: "Chromium executable resolved.",
    level: "info",
    stage: "frame_capture",
    status: "ready",
    technicalDetails: { browserExecutablePath }
  });

  const sceneVideoPaths = [];
  for (const scene of timeline.scenes) {
    const sceneStartedAt = performance.now();
    const sceneFrameDirectory = path.join(jobTempDir, "frames", `${String(scene.index + 1).padStart(3, "0")}-${safeId(scene.id)}`);
    const sceneVideoPath = path.join(jobTempDir, `${String(scene.index + 1).padStart(3, "0")}-${safeId(scene.id)}.mp4`);

    await writeLog({
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
    await writeLog({
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
      await writeLog({
        humanReadableMessage: "Fade transition uses scene-level fade-in and fade-out in the current concat pipeline.",
        level: "warn",
        sceneId: scene.id,
        stage: "scene_render",
        status: "capability_limit",
        technicalDetails: {
          limitation: "Overlapping crossfade between scene MP4 files is not implemented in this phase.",
          transition: scene.transition
        }
      });
    }

    await writeLog({
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
          await writeLog({
            humanReadableMessage: "Frame capture progress.",
            level: "info",
            sceneId: scene.id,
            stage: "frame_capture",
            status: "progress",
            technicalDetails: {
              capturedFrames: progress.capturedFrames,
              totalFrames: progress.totalFrames,
              frameIndex: progress.frameIndex,
              timeMs: Number(progress.timeMs.toFixed(3))
            }
          });
        }
      }
    );

    await writeLog({
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
      width: timeline.settings.width
    });
    await runFfmpegCommand(encodeSceneCommand, nodeProcessRunner, logger, {
      jobId,
      sceneId: scene.id,
      stage: "ffmpeg_encode",
      successMessage: "Scene clip encoded."
    });
    sceneVideoPaths.push(sceneVideoPath);
  }

  const manifestPath = path.join(jobTempDir, "concat.txt");
  await writeConcatManifest(manifestPath, sceneVideoPaths);
  const concatCommand = buildConcatScenesCommand({
    manifestPath,
    outputPath,
    sceneVideoPaths
  });
  await runFfmpegCommand(concatCommand, nodeProcessRunner, logger, {
    jobId,
    stage: "video_export",
    successMessage: "Final MP4 concatenated."
  });

  const validationResult = await validateMp4Output({
    expectedHeight: timeline.settings.height,
    expectedWidth: timeline.settings.width,
    filePath: outputPath,
    runner: nodeProcessRunner
  });
  if (!validationResult.ok) {
    await writeLog({
      errorCode: validationResult.issues[0]?.code,
      humanReadableMessage: "MP4 output validation failed.",
      level: "error",
      stage: "output_validation",
      status: "failed",
      technicalDetails: { issues: validationResult.issues }
    });
    throw new Error(`MP4 output validation failed: ${validationResult.issues[0]?.technicalDetails ?? "unknown output issue"}`);
  }

  await writeLog({
    durationMs: elapsedMs(startedAt),
    humanReadableMessage: "Render job completed.",
    level: "info",
    stage: "output_validation",
    status: "completed",
    technicalDetails: {
      logPath,
      metadata: validationResult.metadata,
      outputPath
    }
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        jobId,
        logPath,
        outputPath,
        metadata: validationResult.metadata
      },
      null,
      2
    )}\n`
  );
}

async function ensureBuiltPackages() {
  for (const relativePath of DIST_REQUIREMENTS) {
    await assertFileExists(path.join(root, relativePath), `Missing ${relativePath}. Run npm run typecheck before npm run render.`);
  }
}

async function assertFileExists(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}

function parseJson(value, inputPath) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Input JSON Script is not valid JSON: ${inputPath}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromiumExecutablePath() {
  const configuredPath = process.env.CHROMIUM_PATH?.trim();
  if (configuredPath !== undefined && configuredPath.length > 0) {
    const resolved = path.resolve(configuredPath);
    await assertFileExists(resolved, `CHROMIUM_PATH does not point to an existing executable: ${resolved}`);
    return resolved;
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    throw new Error("playwright-core is not installed. Run npm install before npm run render.");
  }

  const executablePath = chromium.executablePath();
  await assertFileExists(
    executablePath,
    `Playwright Chromium executable was not found at ${executablePath}. Run npx playwright install chromium. On Colab, run npx playwright install-deps chromium first if system dependencies are missing.`
  );
  return executablePath;
}

async function runFfmpegCommand(command, runner, logger, context) {
  const startedAt = performance.now();
  await logger.write({
    humanReadableMessage: "FFmpeg command started.",
    jobId: context.jobId,
    level: "info",
    sceneId: context.sceneId,
    stage: context.stage,
    status: "started",
    technicalDetails: {
      args: command.args,
      executablePath: command.executablePath
    },
    timestamp: new Date().toISOString()
  });
  const result = await runner.run(command);
  if (result.exitCode !== 0) {
    await logger.write({
      durationMs: elapsedMs(startedAt),
      errorCode: "ENCODER-FFMPEG-001",
      humanReadableMessage: "FFmpeg command failed.",
      jobId: context.jobId,
      level: "error",
      sceneId: context.sceneId,
      stage: context.stage,
      status: "failed",
      technicalDetails: {
        stderr: result.stderr.slice(-4000),
        stdout: result.stdout.slice(-4000)
      },
      timestamp: new Date().toISOString()
    });
    throw new Error(`FFmpeg command failed with exit code ${result.exitCode}: ${result.stderr.slice(-1000)}`);
  }

  await logger.write({
    durationMs: elapsedMs(startedAt),
    humanReadableMessage: context.successMessage,
    jobId: context.jobId,
    level: "info",
    sceneId: context.sceneId,
    stage: context.stage,
    status: "completed",
    timestamp: new Date().toISOString()
  });
}

function safeId(value) {
  return value.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "render";
}

function elapsedMs(startedAt) {
  return Number((performance.now() - startedAt).toFixed(3));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
