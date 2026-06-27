import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HtmlSceneRenderInput, TimelineScene } from "@ovaf/contracts";
import { buildHtmlSceneDocument } from "./scene-document.js";
import { writeScenePreviewDocument } from "./scene-preview.js";
import { captureSceneFrames, captureScenePreview, type ChromiumLauncherPort } from "./playwright-capture.js";
import { renderSceneWithCache } from "./scene-cache-renderer.js";

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-renderer-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

const scene: TimelineScene = {
  id: "scene-001",
  index: 0,
  startSeconds: 0,
  endSeconds: 5,
  durationSeconds: 5,
  startFrame: 0,
  endFrameExclusive: 150,
  durationFrames: 150,
  layers: [
    {
      id: "bg",
      type: "background",
      zIndex: 0,
      source: {
        kind: "color",
        value: "#101010"
      }
    },
    {
      id: "text",
      type: "text",
      zIndex: 1,
      content: "<Hello & goodbye>"
    }
  ]
};

const input: HtmlSceneRenderInput = {
  scene,
  width: 1080,
  height: 1920,
  fps: 30
};

describe("buildHtmlSceneDocument", () => {
  it("creates a fixed 1080x1920 scene document", () => {
    const document = buildHtmlSceneDocument(input);

    expect(document.sceneId).toBe("scene-001");
    expect(document.html).toContain("width: 1080px");
    expect(document.html).toContain("height: 1920px");
    expect(document.html).toContain('data-scene-id="scene-001"');
  });

  it("escapes text content and preserves z-index layer order", () => {
    const html = buildHtmlSceneDocument(input).html;

    expect(html).toContain("&lt;Hello &amp; goodbye&gt;");
    expect(html.indexOf('data-layer-id="bg"')).toBeLessThan(html.indexOf('data-layer-id="text"'));
    expect(html).toContain("z-index:0");
    expect(html).toContain("z-index:1");
  });

  it("renders deterministic animation state for a requested time", () => {
    const html = buildHtmlSceneDocument({
      ...input,
      timeMs: 500,
      scene: {
        ...input.scene,
        transition: {
          name: "fade",
          durationMs: 1000
        },
        layers: [
          input.scene.layers[0]!,
          {
            ...input.scene.layers[1]!,
            animation: [
              {
                name: "fade",
                startMs: 0,
                durationMs: 1000
              },
              {
                name: "slide-up",
                startMs: 0,
                durationMs: 1000
              }
            ]
          }
        ]
      }
    });

    expect(html.html).toContain('data-time-ms="500"');
    expect(html.html).toContain("value: 500");
    expect(html.html).toContain("opacity: 0.5");
    expect(html.html).toContain("opacity:0.5;transform:translateY(80px)");
  });
});

describe("writeScenePreviewDocument", () => {
  it("writes per-scene preview HTML", async () => {
    const result = await writeScenePreviewDocument(input, {
      outputDirectory: path.join(tempRoot, "preview")
    });

    expect(result.sceneId).toBe("scene-001");
    expect(result.htmlPath.endsWith("scene-001.html")).toBe(true);
    expect(readFileSync(result.htmlPath, "utf8")).toContain("scene-root");
  });
});

describe("captureScenePreview", () => {
  it("uses an injected Chromium-compatible launcher", async () => {
    const calls: string[] = [];
    const launcher: ChromiumLauncherPort = {
      launch: async () => ({
        newContext: async () => ({
          newPage: async () => ({
            setViewportSize: async (size) => {
              calls.push(`viewport:${size.width}x${size.height}`);
            },
            setContent: async (html) => {
              calls.push(`html:${html.includes("scene-root")}`);
            },
            screenshot: async (options) => {
              calls.push(`screenshot:${options.path}`);
              writeFileSync(options.path, "fake-image", "utf8");
              return Buffer.from("fake-image");
            }
          }),
          close: async () => {
            calls.push("context.close");
          }
        }),
        close: async () => {
          calls.push("browser.close");
        }
      })
    };
    const outputPath = path.join(tempRoot, "scene.png");

    await expect(captureScenePreview(input, { outputPath, launcher })).resolves.toBe(outputPath);

    expect(existsSync(outputPath)).toBe(true);
    expect(calls).toEqual([
      "viewport:1080x1920",
      "html:true",
      `screenshot:${outputPath}`,
      "context.close",
      "browser.close"
    ]);
  });
});

describe("captureSceneFrames", () => {
  it("captures sequential deterministic frames with an injected launcher", async () => {
    const calls: string[] = [];
    const progressCalls: string[] = [];
    const shortInput: HtmlSceneRenderInput = {
      ...input,
      scene: {
        ...input.scene,
        durationFrames: 3,
        endFrameExclusive: 3
      }
    };
    const launcher: ChromiumLauncherPort = {
      launch: async () => ({
        newContext: async () => ({
          newPage: async () => ({
            setViewportSize: async (size) => {
              calls.push(`viewport:${size.width}x${size.height}`);
            },
            setContent: async (html) => {
              const timeMatch = /data-time-ms="([^"]+)"/u.exec(html);
              calls.push(`html:${timeMatch?.[1] ?? "missing"}`);
            },
            screenshot: async (options) => {
              calls.push(`screenshot:${path.basename(options.path)}`);
              writeFileSync(options.path, "fake-image", "utf8");
              return Buffer.from("fake-image");
            }
          }),
          close: async () => {
            calls.push("context.close");
          }
        }),
        close: async () => {
          calls.push("browser.close");
        }
      })
    };
    const outputDirectory = path.join(tempRoot, "frames");

    const result = await captureSceneFrames(shortInput, {
      outputDirectory,
      launcher,
      progressIntervalFrames: 2,
      onProgress: async (progress) => {
        progressCalls.push(`${progress.capturedFrames}/${progress.totalFrames}:${path.basename(progress.outputPath)}`);
      }
    });

    expect(result.frameCount).toBe(3);
    expect(result.framePattern).toBe(path.join(outputDirectory, "%06d.png"));
    expect(existsSync(path.join(outputDirectory, "000000.png"))).toBe(true);
    expect(existsSync(path.join(outputDirectory, "000002.png"))).toBe(true);
    expect(calls).toEqual([
      "viewport:1080x1920",
      "html:0",
      "screenshot:000000.png",
      "html:33.333333",
      "screenshot:000001.png",
      "html:66.666667",
      "screenshot:000002.png",
      "context.close",
      "browser.close"
    ]);
    expect(progressCalls).toEqual(["1/3:000000.png", "2/3:000001.png", "3/3:000002.png"]);
  });
});

describe("renderSceneWithCache", () => {
  it("renders once and reuses valid scene cache", async () => {
    const metadataPath = path.join(tempRoot, "cache", "scene.json");
    const outputPath = path.join(tempRoot, "scene.png");
    let renderCount = 0;

    const first = await renderSceneWithCache(input, {
      metadataPath,
      outputPath,
      generatorVersion: "renderer-html@0.0.0",
      render: async (targetPath) => {
        renderCount += 1;
        writeFileSync(targetPath, "image", "utf8");
      },
      now: new Date("2026-06-24T00:00:00.000Z")
    });
    const second = await renderSceneWithCache(input, {
      metadataPath,
      outputPath,
      generatorVersion: "renderer-html@0.0.0",
      render: async () => {
        renderCount += 1;
      }
    });

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(renderCount).toBe(1);
  });

  it("regenerates cache when generator version changes", async () => {
    const metadataPath = path.join(tempRoot, "cache", "scene.json");
    const outputPath = path.join(tempRoot, "scene.png");
    let renderCount = 0;

    await renderSceneWithCache(input, {
      metadataPath,
      outputPath,
      generatorVersion: "renderer-html@0.0.0",
      render: async (targetPath) => {
        renderCount += 1;
        writeFileSync(targetPath, "image", "utf8");
      }
    });
    const second = await renderSceneWithCache(input, {
      metadataPath,
      outputPath,
      generatorVersion: "renderer-html@0.0.1",
      render: async (targetPath) => {
        renderCount += 1;
        writeFileSync(targetPath, "image-2", "utf8");
      }
    });

    expect(second.fromCache).toBe(false);
    expect(renderCount).toBe(2);
  });
});
