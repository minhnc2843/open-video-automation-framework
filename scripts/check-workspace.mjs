import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "apps/web/package.json",
  "apps/api/package.json",
  "packages/contracts/package.json",
  "packages/core/package.json",
  "packages/validator/package.json",
  "packages/timeline/package.json",
  "packages/providers/package.json",
  "packages/renderer-html/package.json",
  "packages/asset-manager/package.json",
  "packages/logger/package.json",
  "packages/config/package.json",
  "contracts/README.md",
  "schemas/README.md",
  "docs/START_HERE.md",
  "specs/PROJECT_MEMORY.md",
  "specs/PROJECT_PRINCIPLES.md",
  "specs/MASTER_SPEC.md",
  "specs/AI_RULES.md",
  "specs/CODING_CONVENTIONS.md",
  "ai-prompts/PHASE_00_FOUNDATION.md",
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
