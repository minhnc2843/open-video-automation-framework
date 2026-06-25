import { access, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";

const root = process.cwd();
const iterations = readIterations(process.argv);

async function main() {
  await ensureBuiltPackages();

  const [
    { validateJsonScript },
    { buildTimeline },
    { buildMediaPlan },
    { buildHtmlSceneDocument },
    { buildEncodeMp4Command },
    { buildStyleProfile, validateStyleProfile }
  ] = await Promise.all([
    import("../packages/validator/dist/index.js"),
    import("../packages/timeline/dist/index.js"),
    import("../packages/media/dist/index.js"),
    import("../packages/renderer-html/dist/index.js"),
    import("../packages/encoder-ffmpeg/dist/index.js"),
    import("../packages/reference-video/dist/index.js")
  ]);

  const script = JSON.parse(await readFile(path.join(root, "examples", "basic-vertical-short.json"), "utf8"));
  const startedAt = performance.now();
  let sceneDocuments = 0;
  let audioTracks = 0;
  let ffmpegArgs = 0;

  for (let index = 0; index < iterations; index += 1) {
    const validation = validateJsonScript(script);
    if (!validation.ok) {
      throw new Error(`Example script failed validation: ${validation.issues[0]?.technicalDetails ?? "unknown"}`);
    }

    const timelineResult = buildTimeline(validation.script);
    if (!timelineResult.ok) {
      throw new Error(`Timeline failed: ${timelineResult.issues[0]?.technicalDetails ?? "unknown"}`);
    }
    const timeline = timelineResult.timeline;

    const styleProfile = buildStyleProfile({
      referenceVideo: {
        checksumSha256: "d".repeat(64),
        durationSeconds: timeline.durationSeconds,
        fileName: "reference.mp4",
        fps: timeline.settings.fps,
        height: timeline.settings.height,
        id: "reference-benchmark",
        mimeType: "video/mp4",
        sizeBytes: 4096,
        storagePath: "storage/assets/reference.mp4",
        uploadedAt: "2026-06-25T00:00:00.000Z",
        width: timeline.settings.width
      }
    });
    const styleValidation = validateStyleProfile(styleProfile);
    if (!styleValidation.ok) {
      throw new Error(`Style Profile failed: ${styleValidation.issues[0]?.technicalDetails ?? "unknown"}`);
    }

    const mediaPlan = buildMediaPlan({
      musicSource: {
        id: "music-bed",
        path: "storage/assets/music-bed.wav",
        volume: 0.2
      },
      timeline,
      voiceAssets: timeline.scenes.flatMap((scene) =>
        scene.voiceCue === undefined
          ? []
          : [
              {
                cacheKey: `voice-cache-${scene.id}`,
                durationSeconds: scene.voiceCue.endSeconds - scene.voiceCue.startSeconds,
                id: `voice-${scene.id}`,
                path: `storage/assets/voice-${scene.id}.wav`,
                sceneId: scene.id,
                startSeconds: scene.voiceCue.startSeconds,
                volume: 1
              }
            ]
      )
    });
    if (!mediaPlan.ok) {
      throw new Error(`Media plan failed: ${mediaPlan.issues[0]?.technicalDetails ?? "unknown"}`);
    }

    for (const scene of timeline.scenes) {
      buildHtmlSceneDocument({
        fps: timeline.settings.fps,
        height: timeline.settings.height,
        scene,
        width: timeline.settings.width
      });
      sceneDocuments += 1;
    }

    const command = buildEncodeMp4Command({
      audioTracks: mediaPlan.plan.audioTracks,
      durationSeconds: timeline.durationSeconds,
      fps: timeline.settings.fps,
      height: timeline.settings.height,
      outputPath: "storage/output/benchmark.mp4",
      videoInput: {
        fps: timeline.settings.fps,
        framePattern: "storage/temp/frames/%06d.png",
        kind: "image_sequence"
      },
      width: timeline.settings.width
    });
    audioTracks += mediaPlan.plan.audioTracks.length;
    ffmpegArgs += command.args.length;
  }

  const totalMs = performance.now() - startedAt;
  const result = {
    averageMs: round(totalMs / iterations),
    dryRunOnly: true,
    ffmpegArgs,
    iterations,
    sceneDocuments,
    totalMs: round(totalMs),
    audioTracks
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function ensureBuiltPackages() {
  const required = [
    "packages/validator/dist/index.js",
    "packages/timeline/dist/index.js",
    "packages/media/dist/index.js",
    "packages/renderer-html/dist/index.js",
    "packages/encoder-ffmpeg/dist/index.js",
    "packages/reference-video/dist/index.js"
  ];

  for (const relativePath of required) {
    try {
      await access(path.join(root, relativePath));
    } catch {
      throw new Error(`Missing ${relativePath}. Run npm run typecheck before npm run benchmark:render.`);
    }
  }
}

function readIterations(args) {
  const flag = args.find((arg) => arg.startsWith("--iterations="));
  if (flag === undefined) {
    return 50;
  }

  const value = Number(flag.split("=")[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--iterations must be a positive integer.");
  }

  return value;
}

function round(value) {
  return Number(value.toFixed(3));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
