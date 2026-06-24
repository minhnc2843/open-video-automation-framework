import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "apps/web/package.json",
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
  "contracts/README.md",
  "schemas/README.md",
  "docs/START_HERE.md",
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
