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
