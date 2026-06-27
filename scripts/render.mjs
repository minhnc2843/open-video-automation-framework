#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = process.cwd();
const DIST_REQUIREMENTS = [
  "packages/core/dist/index.js",
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

  const { runRenderJob } = await import("../packages/core/dist/index.js");
  const storageRoot = path.resolve(root, process.env.OVAF_STORAGE_ROOT ?? "storage");
  const inputBaseName = path.basename(inputPath, path.extname(inputPath));
  const jobId = `render-${safeId(inputBaseName)}-${new Date().toISOString().replace(/[-:.TZ]/gu, "")}-${randomUUID().slice(0, 8)}`;
  const script = parseJson(await readFile(inputPath, "utf8"), inputPath);
  const result = await runRenderJob({
    jobId,
    projectId: "cli",
    script,
    storageRoot,
    outputFileName: `${inputBaseName}.mp4`
  });

  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        jobId,
        logPath: result.logPath,
        outputPath: result.outputPath,
        metadata: result.metadata
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

function safeId(value) {
  return value.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").toLowerCase() || "render";
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
