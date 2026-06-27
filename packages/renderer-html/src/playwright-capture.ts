import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import type { HtmlSceneRenderInput } from "@ovaf/contracts";
import { buildHtmlSceneDocument } from "./scene-document.js";

export interface BrowserPagePort {
  readonly setViewportSize: (size: { readonly width: number; readonly height: number }) => Promise<void>;
  readonly setContent: (html: string, options?: { readonly waitUntil?: "load" | "domcontentloaded" | "networkidle" }) => Promise<void>;
  readonly screenshot: (options: { readonly path: string; readonly fullPage?: boolean }) => Promise<Buffer>;
}

export interface BrowserContextPort {
  readonly newPage: () => Promise<BrowserPagePort>;
  readonly close: () => Promise<void>;
}

export interface BrowserPort {
  readonly newContext: (options: { readonly viewport: { readonly width: number; readonly height: number } }) => Promise<BrowserContextPort>;
  readonly close: () => Promise<void>;
}

export interface ChromiumLauncherPort {
  readonly launch: (options?: { readonly headless?: boolean; readonly executablePath?: string }) => Promise<BrowserPort>;
}

export interface CaptureScenePreviewOptions {
  readonly outputPath: string;
  readonly launcher?: ChromiumLauncherPort;
  readonly executablePath?: string;
}

export interface SceneFrameCaptureProgress {
  readonly capturedFrames: number;
  readonly totalFrames: number;
  readonly frameIndex: number;
  readonly timeMs: number;
  readonly outputPath: string;
}

export interface SceneFrameCaptureResult {
  readonly frameDirectory: string;
  readonly framePattern: string;
  readonly frameCount: number;
  readonly firstFramePath: string;
  readonly lastFramePath: string;
}

export interface CaptureSceneFramesOptions {
  readonly outputDirectory: string;
  readonly launcher?: ChromiumLauncherPort;
  readonly executablePath?: string;
  readonly progressIntervalFrames?: number;
  readonly onProgress?: (progress: SceneFrameCaptureProgress) => Promise<void>;
}

export async function captureScenePreview(
  input: HtmlSceneRenderInput,
  options: CaptureScenePreviewOptions
): Promise<string> {
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  const launcher = options.launcher ?? chromium;
  const browser = await launcher.launch({
    headless: true,
    ...(options.executablePath === undefined ? {} : { executablePath: options.executablePath })
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: input.width,
        height: input.height
      }
    });

    try {
      const page = await context.newPage();
      await page.setViewportSize({ width: input.width, height: input.height });
      await page.setContent(buildHtmlSceneDocument(input).html, { waitUntil: "load" });
      await page.screenshot({ path: options.outputPath, fullPage: false });
      return options.outputPath;
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

export async function captureSceneFrames(
  input: HtmlSceneRenderInput,
  options: CaptureSceneFramesOptions
): Promise<SceneFrameCaptureResult> {
  const frameCount = input.scene.durationFrames;
  if (frameCount <= 0) {
    throw new Error(`RENDERER-CAPTURE-001: scene ${input.scene.id} has no frames to capture.`);
  }

  await mkdir(options.outputDirectory, { recursive: true });
  const launcher = options.launcher ?? chromium;
  const browser = await launcher.launch({
    headless: true,
    ...(options.executablePath === undefined ? {} : { executablePath: options.executablePath })
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: input.width,
        height: input.height
      }
    });

    try {
      const page = await context.newPage();
      await page.setViewportSize({ width: input.width, height: input.height });
      const progressIntervalFrames = Math.max(1, options.progressIntervalFrames ?? input.fps);

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const timeMs = (frameIndex / input.fps) * 1000;
        const outputPath = path.join(options.outputDirectory, formatFrameFileName(frameIndex));
        await page.setContent(buildHtmlSceneDocument({ ...input, timeMs }).html, { waitUntil: "load" });
        await page.screenshot({ path: outputPath, fullPage: false });
        await maybeReportProgress(options, progressIntervalFrames, {
          capturedFrames: frameIndex + 1,
          totalFrames: frameCount,
          frameIndex,
          timeMs,
          outputPath
        });
      }

      return {
        frameDirectory: options.outputDirectory,
        framePattern: path.join(options.outputDirectory, "%06d.png"),
        frameCount,
        firstFramePath: path.join(options.outputDirectory, formatFrameFileName(0)),
        lastFramePath: path.join(options.outputDirectory, formatFrameFileName(frameCount - 1))
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function maybeReportProgress(
  options: CaptureSceneFramesOptions,
  progressIntervalFrames: number,
  progress: SceneFrameCaptureProgress
): Promise<void> {
  if (options.onProgress === undefined) {
    return;
  }

  const isFirstFrame = progress.capturedFrames === 1;
  const isLastFrame = progress.capturedFrames === progress.totalFrames;
  const isInterval = progress.capturedFrames % progressIntervalFrames === 0;
  if (isFirstFrame || isLastFrame || isInterval) {
    await options.onProgress(progress);
  }
}

function formatFrameFileName(frameIndex: number): string {
  return `${frameIndex.toString().padStart(6, "0")}.png`;
}
