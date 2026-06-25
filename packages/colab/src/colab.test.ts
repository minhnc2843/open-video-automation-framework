import { describe, expect, it } from "vitest";
import type { ColabEnvironmentProbe, CommandResult } from "./environment-check.js";
import { checkColabEnvironment } from "./environment-check.js";
import { buildColabResumePlan } from "./resume-plan.js";
import { buildColabStoragePaths } from "./storage-layout.js";
import {
  buildColabSyncManifest,
  createDefaultColabSyncFiles,
  validateColabSyncManifest
} from "./sync-manifest.js";

describe("checkColabEnvironment", () => {
  it("reports a healthy Colab-compatible environment", async () => {
    const report = await checkColabEnvironment({
      googleDriveMountPath: "/content/drive",
      now: () => new Date("2026-06-25T00:00:00.000Z"),
      probe: createProbe({
        commands: {
          "chromium --version": { exitCode: 0, stderr: "", stdout: "Chromium 125.0.0\n" },
          "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
          "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
          "node --version": { exitCode: 0, stderr: "", stdout: "v22.3.0\n" },
          "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
        },
        paths: ["/content/drive", "/content/ovaf-storage"]
      })
    });

    expect(report).toMatchObject({
      checkedAt: "2026-06-25T00:00:00.000Z",
      ok: true,
      runtime: "google_colab",
      storageRoot: "/content/ovaf-storage"
    });
    expect(report.checks).toHaveLength(7);
  });

  it("fails required checks for old Node and missing storage", async () => {
    const report = await checkColabEnvironment({
      probe: createProbe({
        commands: {
          "chromium --version": { exitCode: 0, stderr: "", stdout: "Chromium 125.0.0\n" },
          "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
          "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
          "node --version": { exitCode: 0, stderr: "", stdout: "v20.0.0\n" },
          "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
        },
        paths: []
      })
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "node", ok: false }),
        expect.objectContaining({ name: "storage_root", ok: false })
      ])
    );
  });

  it("prefers CHROMIUM_PATH before system browser candidates", async () => {
    await withChromiumPath("/opt/playwright/chromium/chrome", async () => {
      const report = await checkColabEnvironment({
        probe: createProbe({
          commands: {
            "/opt/playwright/chromium/chrome --version": { exitCode: 0, stderr: "", stdout: "Chromium 130.0.0\n" },
            "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
            "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
            "node --version": { exitCode: 0, stderr: "", stdout: "v22.3.0\n" },
            "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
          },
          paths: ["/content/ovaf-storage"]
        })
      });

      expect(report.ok).toBe(true);
      expect(report.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "chromium",
            ok: true,
            humanReadableMessage: "chromium is available via CHROMIUM_PATH."
          })
        ])
      );
    });
  });

  it("detects Playwright-managed Chromium before system browser candidates", async () => {
    const report = await checkColabEnvironment({
      probe: createProbe({
        commands: {
          "/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome --version": {
            exitCode: 0,
            stderr: "",
            stdout: "Chromium 130.0.0\n"
          },
          "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
          "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
          "node --version": { exitCode: 0, stderr: "", stdout: "v22.3.0\n" },
          "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
        },
        paths: ["/content/ovaf-storage"],
        playwrightExecutablePath: "/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome"
      })
    });

    expect(report.ok).toBe(true);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          humanReadableMessage: "chromium is available via Playwright-managed Chromium.",
          name: "chromium",
          ok: true,
          technicalDetails: expect.stringContaining("/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome")
        })
      ])
    );
  });

  it("rejects the Colab chromium-browser snap launcher", async () => {
    const report = await checkColabEnvironment({
      probe: createProbe({
        commands: {
          "chromium-browser --version": {
            exitCode: 0,
            stderr: "",
            stdout: "Command '/usr/bin/chromium-browser' requires the chromium snap to be installed.\n"
          },
          "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
          "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
          "node --version": { exitCode: 0, stderr: "", stdout: "v22.3.0\n" },
          "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
        },
        paths: ["/content/ovaf-storage"]
      })
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          humanReadableMessage: expect.stringContaining("Playwright-managed Chromium"),
          name: "chromium",
          ok: false,
          technicalDetails: expect.stringContaining("snap launcher output")
        })
      ])
    );
  });
});

describe("Colab sync manifest", () => {
  it("builds sorted default sync files", () => {
    const manifest = buildColabSyncManifest({
      createdAt: "2026-06-25T00:00:00.000Z",
      direction: "to_colab",
      files: createDefaultColabSyncFiles(),
      id: "sync-1",
      jobId: "job-1",
      projectId: "project-1",
      projectVersionId: "version-1",
      sourceRoot: "storage",
      targetRoot: "/content/ovaf-storage"
    });

    expect(validateColabSyncManifest(manifest)).toEqual([]);
    expect(manifest.files.map((file) => `${file.kind}:${file.path}`)).toEqual([
      "asset:assets/",
      "cache:cache/",
      "database:projects/project-store.sqlite",
      "log:logs/",
      "output:output/"
    ]);
  });

  it("rejects unsafe paths and invalid checksums", () => {
    const manifest = buildColabSyncManifest({
      direction: "from_colab",
      files: [
        {
          checksumSha256: "not-sha",
          kind: "output",
          path: "../outside.mp4",
          required: true
        }
      ],
      id: "sync-1",
      sourceRoot: "/content/ovaf-storage",
      targetRoot: "storage"
    });

    expect(validateColabSyncManifest(manifest)).toEqual([
      expect.objectContaining({ code: "COLAB-SYNC-001", path: "/files/0/path" }),
      expect.objectContaining({ code: "COLAB-SYNC-001", path: "/files/0/checksumSha256" })
    ]);
  });
});

describe("buildColabResumePlan", () => {
  it("starts queued jobs from validation", () => {
    const plan = buildColabResumePlan({
      job: createJob("queued")
    });

    expect(plan).toEqual({
      action: "start",
      currentStatus: "queued",
      humanReadableMessage: "Render job can start in Colab.",
      jobId: "job-1",
      missingArtifacts: [],
      startStage: "validation"
    });
  });

  it("resumes recoverable jobs when required artifacts are present", () => {
    const manifest = buildColabSyncManifest({
      direction: "to_colab",
      files: [
        {
          kind: "database",
          path: "projects/project-store.sqlite",
          required: true
        },
        {
          kind: "asset",
          path: "assets/",
          required: true
        }
      ],
      id: "sync-1",
      sourceRoot: "storage",
      targetRoot: "/content/ovaf-storage"
    });

    expect(
      buildColabResumePlan({
        availablePaths: ["projects/project-store.sqlite", "assets/"],
        job: createJob("recoverable"),
        manifest
      })
    ).toMatchObject({
      action: "resume",
      startStage: "asset_resolution"
    });
  });

  it("blocks resume when required artifacts are missing", () => {
    const manifest = buildColabSyncManifest({
      direction: "to_colab",
      files: [
        {
          kind: "database",
          path: "projects/project-store.sqlite",
          required: true
        }
      ],
      id: "sync-1",
      sourceRoot: "storage",
      targetRoot: "/content/ovaf-storage"
    });

    expect(
      buildColabResumePlan({
        availablePaths: [],
        job: createJob("rendering"),
        manifest
      })
    ).toEqual({
      action: "blocked",
      currentStatus: "rendering",
      humanReadableMessage: "Colab resume is blocked because required synchronized artifacts are missing.",
      jobId: "job-1",
      missingArtifacts: ["projects/project-store.sqlite"]
    });
  });
});

describe("buildColabStoragePaths", () => {
  it("builds the expected Colab storage layout", () => {
    expect(buildColabStoragePaths("/content/ovaf-storage")).toMatchObject({
      assets: expect.stringContaining("assets"),
      cache: expect.stringContaining("cache"),
      logs: expect.stringContaining("logs"),
      output: expect.stringContaining("output"),
      projects: expect.stringContaining("projects"),
      temp: expect.stringContaining("temp")
    });
  });
});

function createProbe(options: {
  readonly commands: Record<string, CommandResult>;
  readonly paths: readonly string[];
  readonly playwrightExecutablePath?: string;
}): ColabEnvironmentProbe {
  return {
    pathExists: async (targetPath) => options.paths.includes(targetPath),
    resolvePlaywrightChromiumExecutable: async () => options.playwrightExecutablePath,
    run: async (command, args) => {
      const result = options.commands[[command, ...args].join(" ")];
      if (result === undefined) {
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      }

      return result;
    }
  };
}

function createJob(status: Parameters<typeof buildColabResumePlan>[0]["job"]["status"]) {
  return {
    configSnapshot: {},
    createdAt: "2026-06-25T00:00:00.000Z",
    finishedAt: null,
    id: "job-1",
    logPath: null,
    outputPath: null,
    projectId: "project-1",
    projectVersionId: "version-1",
    providerSnapshot: null,
    renderEnvironment: null,
    retryCount: 0,
    startedAt: null,
    status,
    updatedAt: "2026-06-25T00:00:00.000Z"
  };
}

async function withChromiumPath(value: string, callback: () => Promise<void>): Promise<void> {
  const previous = process.env.CHROMIUM_PATH;
  process.env.CHROMIUM_PATH = value;
  try {
    await callback();
  } finally {
    if (previous === undefined) {
      delete process.env.CHROMIUM_PATH;
    } else {
      process.env.CHROMIUM_PATH = previous;
    }
  }
}
