import type { HtmlSceneDocument, HtmlSceneRenderInput, TimelineLayer } from "@ovaf/contracts";

export function buildHtmlSceneDocument(input: HtmlSceneRenderInput): HtmlSceneDocument {
  const layers = [...input.scene.layers].sort((left, right) => left.zIndex - right.zIndex);

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
  <main id="scene-root" data-scene-id="${escapeAttribute(input.scene.id)}" data-fps="${input.fps}">
${layers.map(renderLayer).join("\n")}
  </main>
</body>
</html>
`
  };
}

function renderLayer(layer: TimelineLayer): string {
  const style = `z-index:${layer.zIndex};`;
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
