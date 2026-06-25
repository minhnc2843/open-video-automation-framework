import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { JsonObject, RenderJobRecord, Timeline } from "../../packages/contracts/src/index.js";
import { buildApiApp } from "../../apps/api/src/app.js";
import { buildColabResumePlan, buildColabSyncManifest, createDefaultColabSyncFiles, validateColabSyncManifest } from "../../packages/colab/src/index.js";
import { buildEncodeMp4Command } from "../../packages/encoder-ffmpeg/src/index.js";
import { buildMediaPlan } from "../../packages/media/src/index.js";
import { SqliteProjectRepository } from "../../packages/persistence/src/index.js";
import { buildStyleProfile, validateStyleProfile } from "../../packages/reference-video/src/index.js";
import { buildHtmlSceneDocument } from "../../packages/renderer-html/src/index.js";
import { buildTimeline } from "../../packages/timeline/src/index.js";
import { validateJsonScript } from "../../packages/validator/src/index.js";

describe("Phase 15 acceptance smoke path", () => {
  it("runs the example project through validation, planning, API metadata and Colab resume checks", async () => {
    const script = JSON.parse(await readFile(path.join(process.cwd(), "examples", "basic-vertical-short.json"), "utf8")) as unknown;
    const validation = validateJsonScript(script);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      throw new Error("Expected example JSON Script to validate.");
    }

    const timelineResult = buildTimeline(validation.script);
    expect(timelineResult.ok).toBe(true);
    if (!timelineResult.ok) {
      throw new Error("Expected Timeline to build.");
    }
    const timeline = timelineResult.timeline;

    const styleProfile = buildStyleProfile({
      capabilities: {
        maxStrength: 0.85,
        supportedProperties: ["cameraMovement", "colorPalette", "textPlacement"]
      },
      createdAt: "2026-06-25T00:00:00.000Z",
      properties: {
        cameraMovement: {
          enabled: true,
          strength: 0.65,
          summary: "Prefer slow push-in motion when possible."
        },
        colorPalette: {
          enabled: true,
          strength: 0.5,
          summary: "Prefer teal and charcoal contrast."
        }
      },
      referenceVideo: {
        checksumSha256: "c".repeat(64),
        durationSeconds: 10,
        fileName: "reference.mp4",
        fps: 30,
        height: 1920,
        id: "reference-1",
        mimeType: "video/mp4",
        sizeBytes: 4096,
        storagePath: "storage/assets/reference.mp4",
        uploadedAt: "2026-06-25T00:00:00.000Z",
        width: 1080
      }
    });
    const styleValidation = validateStyleProfile(styleProfile);
    expect(styleValidation.ok).toBe(true);

    const mediaPlan = buildMediaPlan({
      musicSource: {
        id: "music-bed",
        path: "storage/assets/music-bed.wav",
        volume: 0.2
      },
      timeline,
      voiceAssets: buildVoiceAssets(timeline)
    });
    expect(mediaPlan.ok).toBe(true);
    if (!mediaPlan.ok) {
      throw new Error("Expected media plan to build.");
    }
    expect(mediaPlan.plan.audioTracks).toHaveLength(3);

    const firstScene = timeline.scenes[0];
    if (firstScene === undefined) {
      throw new Error("Expected example Timeline to contain at least one scene.");
    }
    const sceneDocument = buildHtmlSceneDocument({
      fps: timeline.settings.fps,
      height: timeline.settings.height,
      scene: firstScene,
      width: timeline.settings.width
    });
    expect(sceneDocument.html).toContain("Build from structure");

    const encodeCommand = buildEncodeMp4Command({
      audioTracks: mediaPlan.plan.audioTracks,
      durationSeconds: timeline.durationSeconds,
      fps: timeline.settings.fps,
      height: timeline.settings.height,
      outputPath: "storage/output/acceptance.mp4",
      videoInput: {
        fps: timeline.settings.fps,
        framePattern: "storage/temp/frames/%06d.png",
        kind: "image_sequence"
      },
      width: timeline.settings.width
    });
    expect(encodeCommand.args).toContain("-filter_complex");
    expect(encodeCommand.args.at(-1)).toBe("storage/output/acceptance.mp4");

    const tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-acceptance-"));
    const repository = SqliteProjectRepository.open({
      databasePath: path.join(tempRoot, "acceptance.sqlite")
    });
    try {
      const app = buildApiApp({ repository });
      await expect(
        app.inject({
          method: "POST",
          payload: {
            id: "workspace-acceptance",
            name: "Acceptance Workspace"
          },
          url: "/workspaces"
        })
      ).resolves.toMatchObject({ statusCode: 201 });
      await expect(
        app.inject({
          method: "POST",
          payload: {
            id: "project-acceptance",
            language: "en",
            name: validation.script.project.name,
            workspaceId: "workspace-acceptance"
          },
          url: "/projects"
        })
      ).resolves.toMatchObject({ statusCode: 201 });
      await expect(
        app.inject({
          method: "POST",
          payload: {
            id: "version-acceptance",
            scriptSnapshot: validation.script as unknown as JsonObject,
            settingsSnapshot: validation.script.settings as unknown as JsonObject,
            styleProfileSnapshot: styleProfile as unknown as JsonObject
          },
          url: "/projects/project-acceptance/versions"
        })
      ).resolves.toMatchObject({ statusCode: 201 });
      const jobResponse = await app.inject({
        method: "POST",
        payload: {
          configSnapshot: {
            mode: "acceptance-smoke"
          },
          id: "job-acceptance",
          logPath: "storage/logs/job-acceptance.jsonl",
          outputPath: "storage/output/acceptance.mp4",
          projectId: "project-acceptance",
          projectVersionId: "version-acceptance"
        },
        url: "/jobs"
      });
      expect(jobResponse.statusCode).toBe(201);
      const job = (jobResponse.json() as { readonly data: RenderJobRecord }).data;

      const manifest = buildColabSyncManifest({
        createdAt: "2026-06-25T00:00:00.000Z",
        direction: "to_colab",
        files: createDefaultColabSyncFiles({
          includeLogs: false,
          includeOutput: false
        }),
        id: "sync-acceptance",
        jobId: job.id,
        projectId: job.projectId,
        projectVersionId: job.projectVersionId,
        sourceRoot: "storage",
        targetRoot: "/content/ovaf-storage"
      });
      expect(validateColabSyncManifest(manifest)).toEqual([]);
      expect(
        buildColabResumePlan({
          availablePaths: ["assets/", "cache/", "projects/project-store.sqlite"],
          job,
          manifest
        })
      ).toMatchObject({
        action: "start",
        startStage: "validation"
      });
    } finally {
      repository.close();
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

function buildVoiceAssets(timeline: Timeline) {
  return timeline.scenes.flatMap((scene) =>
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
  );
}
