import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HtmlSceneRenderInput, ScenePreviewResult } from "@ovaf/contracts";
import { buildHtmlSceneDocument } from "./scene-document.js";

export interface WriteScenePreviewOptions {
  readonly outputDirectory: string;
}

export async function writeScenePreviewDocument(
  input: HtmlSceneRenderInput,
  options: WriteScenePreviewOptions
): Promise<ScenePreviewResult> {
  const document = buildHtmlSceneDocument(input);
  await mkdir(options.outputDirectory, { recursive: true });
  const htmlPath = path.join(options.outputDirectory, `${safeFileName(input.scene.id)}.html`);
  await writeFile(htmlPath, document.html, "utf8");

  return {
    sceneId: input.scene.id,
    htmlPath
  };
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/giu, "_");
}
