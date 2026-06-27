import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv, type ErrorObject } from "ajv";
import type { AnimationTiming, FrameworkErrorCode, JsonObject, JsonScript, JsonScriptLayer, JsonScriptScene } from "@ovaf/contracts";

export interface JsonScriptValidationIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly sceneId?: string;
}

export interface JsonScriptValidationSuccess {
  readonly ok: true;
  readonly script: JsonScript;
}

export interface JsonScriptValidationFailure {
  readonly ok: false;
  readonly issues: readonly JsonScriptValidationIssue[];
}

export type JsonScriptValidationResult = JsonScriptValidationSuccess | JsonScriptValidationFailure;

export interface JsonScriptValidatorOptions {
  readonly schemaPath?: string;
  readonly existingAssetPaths?: readonly string[];
}

export function validateJsonScript(
  input: unknown,
  options: JsonScriptValidatorOptions = {}
): JsonScriptValidationResult {
  const schemaPath = options.schemaPath ?? path.join(process.cwd(), "schemas", "json-script.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonObject;
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile<JsonScript>(schema);

  const candidate = input;

  if (!validate(candidate)) {
    return {
      ok: false,
      issues: mapSchemaErrors(validate.errors ?? [])
    };
  }

  const semanticIssues = validateSemanticRules(candidate, options);
  if (semanticIssues.length > 0) {
    return {
      ok: false,
      issues: semanticIssues
    };
  }

  return {
    ok: true,
    script: candidate
  };
}

function mapSchemaErrors(errors: readonly ErrorObject[]): readonly JsonScriptValidationIssue[] {
  return errors.map((error) => ({
    code: "SCRIPT-SCHEMA-001",
    path: error.instancePath === "" ? "/" : error.instancePath,
    humanReadableMessage: "JSON Script does not match the required schema.",
    technicalDetails: `${error.instancePath || "/"} ${error.message ?? "failed schema validation"}`
  }));
}

function validateSemanticRules(
  script: JsonScript,
  options: JsonScriptValidatorOptions
): readonly JsonScriptValidationIssue[] {
  const issues: JsonScriptValidationIssue[] = [];
  const totalDuration = sumSceneDurations(script.scenes);

  if (!almostEqual(totalDuration, script.settings.maxDurationSeconds)) {
    issues.push({
      code: "SCRIPT-SEMANTIC-001",
      path: "/scenes",
      humanReadableMessage: "Total scene duration must match configured video duration.",
      technicalDetails: `Total scene duration is ${totalDuration}, expected ${script.settings.maxDurationSeconds}.`
    });
  }

  for (const [sceneIndex, scene] of script.scenes.entries()) {
    validateSceneRules(script, scene, sceneIndex, options, issues);
  }

  return issues;
}

function validateSceneRules(
  script: JsonScript,
  scene: JsonScriptScene,
  sceneIndex: number,
  options: JsonScriptValidatorOptions,
  issues: JsonScriptValidationIssue[]
): void {
  const scenePath = `/scenes/${sceneIndex}`;

  if (script.settings.voiceEnabled && scene.voice?.text.trim() === undefined) {
    issues.push({
      code: "SCRIPT-SEMANTIC-002",
      path: `${scenePath}/voice/text`,
      sceneId: scene.id,
      humanReadableMessage: "Voice is enabled but scene voice text is missing.",
      technicalDetails: `Scene ${scene.id} does not define voice.text.`
    });
  }

  if (script.settings.subtitleEnabled && !sceneHasSubtitleText(scene)) {
    issues.push({
      code: "SCRIPT-SEMANTIC-003",
      path: scenePath,
      sceneId: scene.id,
      humanReadableMessage: "Subtitle is enabled but no subtitle text can be derived for this scene.",
      technicalDetails: `Scene ${scene.id} requires voice.text or text layer content.`
    });
  }

  const seenLayerIds = new Set<string>();
  for (const [layerIndex, layer] of scene.layers.entries()) {
    const layerPath = `${scenePath}/layers/${layerIndex}`;

    if (seenLayerIds.has(layer.id)) {
      issues.push({
        code: "SCRIPT-SEMANTIC-004",
        path: `${layerPath}/id`,
        sceneId: scene.id,
        humanReadableMessage: "Layer id must be unique within a scene.",
        technicalDetails: `Duplicate layer id '${layer.id}' in scene ${scene.id}.`
      });
    }
    seenLayerIds.add(layer.id);

    if (layer.source?.kind === "asset") {
      validateAssetReference(layer.source.path, layerPath, scene.id, options, issues);
    }

    validateLayerAnimationTiming(layer, layerPath, scene, issues);
  }

  validateSceneTransitionTiming(scene, scenePath, issues);
}

function validateLayerAnimationTiming(
  layer: JsonScriptLayer,
  layerPath: string,
  scene: JsonScriptScene,
  issues: JsonScriptValidationIssue[]
): void {
  const timings = toAnimationTimings(layer.animation);

  for (const [animationIndex, animation] of timings.entries()) {
    validateTimingWindow({
      durationMs: animation.durationMs,
      path:
        Array.isArray(layer.animation) ? `${layerPath}/animation/${animationIndex}` : `${layerPath}/animation`,
      scene,
      startMs: animation.startMs,
      subject: `Animation '${animation.name}' on layer '${layer.id}'`
    }, issues);
  }
}

function validateSceneTransitionTiming(
  scene: JsonScriptScene,
  scenePath: string,
  issues: JsonScriptValidationIssue[]
): void {
  if (scene.transition === undefined) {
    return;
  }

  validateTimingWindow({
    durationMs: scene.transition.durationMs,
    path: `${scenePath}/transition`,
    scene,
    startMs: 0,
    subject: `Scene transition '${scene.transition.name}'`
  }, issues);
}

function validateTimingWindow(
  input: {
    readonly durationMs: number;
    readonly path: string;
    readonly scene: JsonScriptScene;
    readonly startMs: number;
    readonly subject: string;
  },
  issues: JsonScriptValidationIssue[]
): void {
  const sceneDurationMs = input.scene.durationSeconds * 1000;
  const endMs = input.startMs + input.durationMs;

  if (endMs <= sceneDurationMs + 0.000001) {
    return;
  }

  issues.push({
    code: "SCRIPT-SEMANTIC-005",
    path: input.path,
    sceneId: input.scene.id,
    humanReadableMessage: "Animation or transition timing exceeds the scene duration.",
    technicalDetails: `${input.subject} ends at ${endMs}ms, but scene ${input.scene.id} is ${sceneDurationMs}ms.`
  });
}

function toAnimationTimings(animation: JsonScriptLayer["animation"]): readonly AnimationTiming[] {
  if (animation === undefined) {
    return [];
  }

  return isAnimationTimingArray(animation) ? animation : [animation];
}

function isAnimationTimingArray(animation: NonNullable<JsonScriptLayer["animation"]>): animation is readonly AnimationTiming[] {
  return Array.isArray(animation);
}

function validateAssetReference(
  assetPath: string | undefined,
  layerPath: string,
  sceneId: string,
  options: JsonScriptValidatorOptions,
  issues: JsonScriptValidationIssue[]
): void {
  const existingAssetPaths = new Set(options.existingAssetPaths ?? []);

  if (assetPath !== undefined && !existingAssetPaths.has(assetPath)) {
    issues.push({
      code: "SCRIPT-ASSET-001",
      path: `${layerPath}/source/path`,
      sceneId,
      humanReadableMessage: "Referenced asset does not exist.",
      technicalDetails: `Asset '${assetPath}' was not found in the provided asset set.`
    });
  }
}

function sceneHasSubtitleText(scene: JsonScriptScene): boolean {
  if (scene.voice?.text.trim()) {
    return true;
  }

  return scene.layers.some((layer) => layer.type === "text" && layer.content?.trim());
}

function sumSceneDurations(scenes: readonly JsonScriptScene[]): number {
  return Number(scenes.reduce((total, scene) => total + scene.durationSeconds, 0).toFixed(6));
}

function almostEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}
