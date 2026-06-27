import type { AnimationEasing, AnimationTiming, HtmlSceneDocument, HtmlSceneRenderInput, LayerAnimation, SceneTransition, TimelineLayer } from "@ovaf/contracts";

export function buildHtmlSceneDocument(input: HtmlSceneRenderInput): HtmlSceneDocument {
  const layers = [...input.scene.layers].sort((left, right) => left.zIndex - right.zIndex);
  const timeMs = Math.max(0, input.timeMs ?? 0);
  const sceneOpacity = computeSceneOpacity(input.scene.transition, timeMs, input.scene.durationSeconds * 1000);

  return {
    sceneId: input.scene.id,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${input.width}, initial-scale=1">
  <title>${escapeHtml(input.scene.id)}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: ${input.width}px;
      height: ${input.height}px;
      overflow: hidden;
      background: #000;
    }
    #scene-root {
      position: relative;
      width: ${input.width}px;
      height: ${input.height}px;
      overflow: hidden;
      background: #000;
      font-family: Arial, Helvetica, sans-serif;
      opacity: ${formatCssNumber(sceneOpacity)};
    }
    .layer {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
    }
    .layer-text {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 72px;
      color: #fff;
      font-size: 72px;
      line-height: 1.15;
      text-align: center;
      white-space: pre-wrap;
    }
    .layer-media {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  <main id="scene-root" data-scene-id="${escapeAttribute(input.scene.id)}" data-fps="${input.fps}" data-time-ms="${formatCssNumber(timeMs)}">
${layers.map((layer) => renderLayer(layer, timeMs)).join("\n")}
  </main>
  <script>
    Object.defineProperty(window, "__OVAF_RENDER_TIME_MS__", {
      value: ${formatCssNumber(timeMs)},
      configurable: false
    });
  </script>
</body>
</html>
`
  };
}

function renderLayer(layer: TimelineLayer, timeMs: number): string {
  const style = `z-index:${layer.zIndex};${buildAnimationStyle(layer, timeMs)}`;
  const dataAttributes = `data-layer-id="${escapeAttribute(layer.id)}" data-layer-type="${escapeAttribute(layer.type)}"`;

  if (layer.type === "background" && layer.source?.kind === "color") {
    return `    <section class="layer layer-background" ${dataAttributes} style="${style}background:${escapeAttribute(
      layer.source.value ?? "#000"
    )};"></section>`;
  }

  if (layer.type === "text") {
    return `    <section class="layer layer-text" ${dataAttributes} style="${style}">${escapeHtml(
      layer.content ?? ""
    )}</section>`;
  }

  if (layer.type === "image" && layer.source?.kind === "asset" && layer.source.path !== undefined) {
    return `    <img class="layer layer-media" ${dataAttributes} style="${style}" src="${escapeAttribute(
      layer.source.path
    )}" alt="">`;
  }

  if (layer.type === "video" && layer.source?.kind === "asset" && layer.source.path !== undefined) {
    return `    <video class="layer layer-media" ${dataAttributes} style="${style}" src="${escapeAttribute(
      layer.source.path
    )}" muted playsinline></video>`;
  }

  return `    <section class="layer" ${dataAttributes} style="${style}"></section>`;
}

function buildAnimationStyle(layer: TimelineLayer, timeMs: number): string {
  if (layer.type !== "text" && layer.type !== "image") {
    return "";
  }

  const timings = toAnimationTimings(layer.animation);
  if (timings.length === 0) {
    return "";
  }

  let opacity = 1;
  const transforms: string[] = [];

  for (const timing of timings) {
    const progress = easedProgress(timeMs, timing.startMs, timing.durationMs, timing.easing ?? "linear");

    if (timing.name === "fade") {
      opacity *= progress;
    } else if (timing.name === "slide-up") {
      transforms.push(`translateY(${formatCssNumber((1 - progress) * 160)}px)`);
    } else if (timing.name === "slide-left") {
      transforms.push(`translateX(${formatCssNumber((1 - progress) * 180)}px)`);
    } else if (timing.name === "zoom-in") {
      transforms.push(`scale(${formatCssNumber(0.86 + progress * 0.14)})`);
    } else {
      transforms.push(`scale(${formatCssNumber(1.14 - progress * 0.14)})`);
    }
  }

  const transformStyle = transforms.length > 0 ? `transform:${transforms.join(" ")};transform-origin:center center;` : "";
  return `opacity:${formatCssNumber(opacity)};${transformStyle}`;
}

function toAnimationTimings(animation: LayerAnimation | undefined): readonly AnimationTiming[] {
  if (animation === undefined) {
    return [];
  }

  return isAnimationTimingArray(animation) ? animation : [animation];
}

function isAnimationTimingArray(animation: LayerAnimation): animation is readonly AnimationTiming[] {
  return Array.isArray(animation);
}

function easedProgress(timeMs: number, startMs: number, durationMs: number, easing: AnimationEasing): number {
  const linearProgress = clamp01((timeMs - startMs) / durationMs);

  if (easing === "ease-in") {
    return linearProgress * linearProgress;
  }

  if (easing === "ease-out") {
    return 1 - (1 - linearProgress) * (1 - linearProgress);
  }

  if (easing === "ease-in-out") {
    return linearProgress < 0.5
      ? 2 * linearProgress * linearProgress
      : 1 - ((-2 * linearProgress + 2) * (-2 * linearProgress + 2)) / 2;
  }

  return linearProgress;
}

function computeSceneOpacity(transition: SceneTransition | undefined, timeMs: number, sceneDurationMs: number): number {
  if (transition?.name !== "fade") {
    return 1;
  }

  const fadeDurationMs = Math.min(transition.durationMs, sceneDurationMs);
  const fadeInOpacity = clamp01(timeMs / fadeDurationMs);
  const fadeOutOpacity = clamp01((sceneDurationMs - timeMs) / fadeDurationMs);
  return Math.min(fadeInOpacity, fadeOutOpacity);
}

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function formatCssNumber(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
