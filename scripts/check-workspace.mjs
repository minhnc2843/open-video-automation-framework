import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "apps/web/package.json",
  "apps/web/index.html",
  "apps/web/src/main.tsx",
  "apps/web/src/App.tsx",
  "apps/web/src/api/client.ts",
  "apps/web/src/state/useVideoAutomationWorkspace.ts",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  "vitest.config.ts",
  "apps/api/package.json",
  "apps/api/src/index.ts",
  "packages/contracts/package.json",
  "packages/contracts/src/index.ts",
  "packages/core/package.json",
  "packages/core/src/index.ts",
  "packages/validator/package.json",
  "packages/validator/src/index.ts",
  "schemas/json-script.schema.json",
  "packages/timeline/package.json",
  "packages/timeline/src/index.ts",
  "packages/providers/package.json",
  "packages/providers/tsconfig.json",
  "packages/providers/src/index.ts",
  "packages/providers/src/provider-registry.ts",
  "packages/providers/src/credential-vault.ts",
  "packages/providers/src/provider-runner.ts",
  "packages/media/package.json",
  "packages/media/tsconfig.json",
  "packages/media/src/index.ts",
  "packages/media/src/media-plan.ts",
  "packages/media/src/subtitle-document.ts",
  "packages/media/src/voice-plan.ts",
  "packages/media/src/music-plan.ts",
  "packages/reference-video/package.json",
  "packages/reference-video/tsconfig.json",
  "packages/reference-video/src/index.ts",
  "packages/reference-video/src/reference-video-metadata.ts",
  "packages/reference-video/src/style-profile-validator.ts",
  "packages/reference-video/src/capability-warnings.ts",
  "packages/colab/package.json",
  "packages/colab/tsconfig.json",
  "packages/colab/src/index.ts",
  "packages/colab/src/environment-check.ts",
  "packages/colab/src/sync-manifest.ts",
  "packages/colab/src/resume-plan.ts",
  "packages/renderer-html/package.json",
  "packages/renderer-html/src/index.ts",
  "packages/encoder-ffmpeg/package.json",
  "packages/encoder-ffmpeg/src/index.ts",
  "packages/asset-manager/package.json",
  "packages/asset-manager/src/index.ts",
  "packages/logger/package.json",
  "packages/logger/src/index.ts",
  "packages/config/package.json",
  "packages/config/src/index.ts",
  "packages/persistence/package.json",
  "packages/persistence/src/index.ts",
  "packages/persistence/src/migrations.ts",
  "examples/basic-vertical-short.json",
  "tests/integration/pipeline-smoke.test.ts",
  "tests/integration/render-cli.test.ts",
  "scripts/benchmark-render.mjs",
  "scripts/render.mjs",
  "CONTRIBUTING.md",
  "contracts/README.md",
  "schemas/README.md",
  "docs/START_HERE.md",
  "docs/COLAB_OPERATIONS.md",
  "docs/RELEASE_CHECKLIST.md",
  "colab/README.md",
  "colab/bootstrap_colab.py",
  "colab/setup_colab.py",
  "schemas/style-profile.schema.json",
  "specs/PROJECT_MEMORY.md",
  "specs/PROJECT_PRINCIPLES.md",
  "specs/MASTER_SPEC.md",
  "specs/AI_RULES.md",
  "specs/CODING_CONVENTIONS.md",
  "specs/ERROR_CODES.md",
  "specs/EVENT_STANDARD.md",
  "ai-prompts/PHASE_00_FOUNDATION.md",
  "ai-prompts/PHASE_01_CONTRACTS_CONFIG.md",
  "ai-prompts/PHASE_02_PERSISTENCE.md",
  "ai-prompts/PHASE_03_SCRIPT_VALIDATOR.md",
  "ai-prompts/PHASE_04_TIMELINE_ENGINE.md",
  "ai-prompts/PHASE_05_ASSET_MANAGER_CACHE.md",
  "ai-prompts/PHASE_06_JOB_WORKER_LOGGER.md",
  "ai-prompts/PHASE_07_HTML_SCENE_RENDERER.md",
  "ai-prompts/PHASE_08_FFMPEG_ENCODER.md",
  "ai-prompts/PHASE_09_API_LAYER.md",
  "ai-prompts/PHASE_10_WEB_UI_BASELINE.md",
  "ai-prompts/PHASE_11_PROVIDER_PLUGIN_INFRASTRUCTURE.md",
  "ai-prompts/PHASE_12_MEDIA_ADAPTERS.md",
  "ai-prompts/PHASE_13_REFERENCE_VIDEO_STYLE_PROFILE.md",
  "ai-prompts/PHASE_14_GOOGLE_COLAB_OPERATIONS.md",
  "ai-prompts/PHASE_15_TESTING_BENCHMARK_RELEASE.md",
  "adr/ADR-009-GOOGLE-COLAB-OPERATIONS.md",
  "adr/ADR-008-REFERENCE-VIDEO-STYLE-PROFILE.md",
  "adr/ADR-007-MEDIA-ADAPTERS-PACKAGE.md",
  "adr/ADR-006-PROVIDER-PLUGIN-INFRASTRUCTURE.md",
  "adr/ADR-005-FFMPEG-ENCODER-ADAPTER-PACKAGE.md",
  "adr/ADR-004-PERSISTENCE-ADAPTER-PACKAGE.md",
  "architecture/SYSTEM_ARCHITECTURE.md"
];

const expectedWorkspaces = ["apps/*", "packages/*"];

async function pathExists(relativePath) {
  await access(path.join(root, relativePath));
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw);
}

async function main() {
  await Promise.all(requiredPaths.map(pathExists));

  const packageJson = await readJson("package.json");
  const workspaces = packageJson.workspaces ?? [];
  const missingWorkspaces = expectedWorkspaces.filter((workspace) => !workspaces.includes(workspace));

  if (missingWorkspaces.length > 0) {
    throw new Error(`Missing npm workspaces: ${missingWorkspaces.join(", ")}`);
  }

  if (packageJson.private !== true) {
    throw new Error("Root package.json must be private for npm workspaces.");
  }

  process.stdout.write("Workspace baseline check passed.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
