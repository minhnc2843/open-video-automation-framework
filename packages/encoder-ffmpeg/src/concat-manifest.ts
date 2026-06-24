import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function buildConcatManifestContent(sceneVideoPaths: readonly string[]): string {
  return `${sceneVideoPaths.map((scenePath) => `file '${escapeConcatPath(scenePath)}'`).join("\n")}\n`;
}

export async function writeConcatManifest(manifestPath: string, sceneVideoPaths: readonly string[]): Promise<void> {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, buildConcatManifestContent(sceneVideoPaths), "utf8");
}

function escapeConcatPath(value: string): string {
  return value.replaceAll("\\", "/").replaceAll("'", "'\\''");
}
