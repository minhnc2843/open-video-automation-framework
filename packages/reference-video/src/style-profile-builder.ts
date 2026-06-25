import type {
  ReferenceVideoMetadata,
  StyleProfile,
  StyleProfileProperties,
  StyleProfileProperty,
  StyleProfilePropertyKey
} from "@ovaf/contracts";
import { STYLE_PROFILE_PROPERTY_KEYS } from "@ovaf/contracts";
import { buildStyleProfileCapabilityWarnings, type StyleProfileCapabilitySet } from "./capability-warnings.js";

export type StyleProfilePropertyInput = Partial<StyleProfileProperty>;

export interface BuildStyleProfileInput {
  readonly referenceVideo: ReferenceVideoMetadata;
  readonly properties?: Partial<Record<StyleProfilePropertyKey, StyleProfilePropertyInput>>;
  readonly analysisProviderId?: string;
  readonly createdAt?: string;
  readonly capabilities?: StyleProfileCapabilitySet;
}

export function buildStyleProfile(input: BuildStyleProfileInput): StyleProfile {
  const properties = buildProperties(input.properties ?? {});
  const profileWithoutWarnings: StyleProfile = {
    properties,
    referenceVideo: input.referenceVideo,
    version: "1.0",
    warnings: [],
    ...(input.analysisProviderId === undefined ? {} : { analysisProviderId: input.analysisProviderId }),
    ...(input.createdAt === undefined ? {} : { createdAt: input.createdAt })
  };

  return {
    ...profileWithoutWarnings,
    warnings:
      input.capabilities === undefined
        ? []
        : buildStyleProfileCapabilityWarnings(profileWithoutWarnings, input.capabilities)
  };
}

function buildProperties(input: Partial<Record<StyleProfilePropertyKey, StyleProfilePropertyInput>>): StyleProfileProperties {
  return Object.fromEntries(
    STYLE_PROFILE_PROPERTY_KEYS.map((key) => {
      const property = input[key];
      return [
        key,
        {
          enabled: property?.enabled ?? false,
          strength: property?.enabled === true ? property.strength ?? 0.5 : 0,
          summary: property?.summary ?? "",
          ...(property?.evidence === undefined ? {} : { evidence: property.evidence })
        }
      ];
    })
  ) as StyleProfileProperties;
}
