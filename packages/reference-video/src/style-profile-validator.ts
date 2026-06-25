import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv, type ErrorObject } from "ajv";
import type { FormatsPlugin } from "ajv-formats";
import type {
  JsonObject,
  StyleProfile,
  StyleProfileValidationIssue
} from "@ovaf/contracts";
import { STYLE_PROFILE_PROPERTY_KEYS } from "@ovaf/contracts";
import { buildStyleProfileCapabilityWarnings, type StyleProfileCapabilitySet } from "./capability-warnings.js";
import { validateReferenceVideoMetadata } from "./reference-video-metadata.js";
import { getDefaultStyleProfileSchemaPath } from "./schema-path.js";

const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as FormatsPlugin;

export interface StyleProfileValidatorOptions {
  readonly schemaPath?: string;
  readonly capabilities?: StyleProfileCapabilitySet;
}

export function validateStyleProfile(input: unknown, options: StyleProfileValidatorOptions = {}) {
  const schemaPath = options.schemaPath ?? getDefaultStyleProfileSchemaPath();
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as JsonObject;
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile<StyleProfile>(schema);

  if (!validate(input)) {
    return {
      issues: mapSchemaErrors(validate.errors ?? []),
      ok: false as const
    };
  }

  const semanticIssues = validateStyleProfileSemantics(input);
  if (semanticIssues.length > 0) {
    return {
      issues: semanticIssues,
      ok: false as const
    };
  }

  const warnings =
    options.capabilities === undefined ? input.warnings : buildStyleProfileCapabilityWarnings(input, options.capabilities);
  const profile: StyleProfile = {
    ...input,
    warnings
  };

  return {
    ok: true as const,
    profile
  };
}

export function validateStyleProfileSemantics(profile: StyleProfile): readonly StyleProfileValidationIssue[] {
  const issues: StyleProfileValidationIssue[] = [...validateReferenceVideoMetadata(profile.referenceVideo)];

  for (const key of STYLE_PROFILE_PROPERTY_KEYS) {
    const property = profile.properties[key];
    if (!property.enabled && property.strength !== 0) {
      issues.push({
        code: "STYLE-PROFILE-SEMANTIC-001",
        humanReadableMessage: "Disabled style properties must have strength 0.",
        path: `/properties/${key}/strength`,
        technicalDetails: `Property "${key}" is disabled with strength ${property.strength}.`
      });
    }

    if (property.enabled && property.summary.trim().length === 0) {
      issues.push({
        code: "STYLE-PROFILE-SEMANTIC-001",
        humanReadableMessage: "Enabled style properties require a summary.",
        path: `/properties/${key}/summary`,
        technicalDetails: `Property "${key}" is enabled without a human-reviewable summary.`
      });
    }
  }

  return issues;
}

function mapSchemaErrors(errors: readonly ErrorObject[]): readonly StyleProfileValidationIssue[] {
  return errors.map((error) => ({
    code: "STYLE-PROFILE-SCHEMA-001",
    humanReadableMessage: "Style Profile does not match the required schema.",
    path: error.instancePath === "" ? "/" : error.instancePath,
    technicalDetails: `${error.instancePath || "/"} ${error.message ?? "failed schema validation"}`
  }));
}
