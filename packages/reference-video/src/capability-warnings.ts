import type {
  StyleProfile,
  StyleProfileCapabilityWarning,
  StyleProfilePropertyKey
} from "@ovaf/contracts";
import { STYLE_PROFILE_PROPERTY_KEYS } from "@ovaf/contracts";

export interface StyleProfileCapabilitySet {
  readonly supportedProperties: readonly StyleProfilePropertyKey[];
  readonly maxStrength?: number;
}

export function buildStyleProfileCapabilityWarnings(
  profile: StyleProfile,
  capabilities: StyleProfileCapabilitySet
): readonly StyleProfileCapabilityWarning[] {
  const warnings: StyleProfileCapabilityWarning[] = [];
  const supported = new Set(capabilities.supportedProperties);
  const maxStrength = capabilities.maxStrength ?? 0.85;

  for (const key of STYLE_PROFILE_PROPERTY_KEYS) {
    const property = profile.properties[key];
    if (!property.enabled) {
      continue;
    }

    if (!supported.has(key)) {
      warnings.push({
        code: "STYLE-PROFILE-CAPABILITY-001",
        humanReadableMessage: "Style property is enabled but not supported by the current capability set.",
        path: `/properties/${key}`,
        property: key,
        severity: "warning",
        technicalDetails: `Property "${key}" should be reviewed or disabled before relying on the current renderer/provider.`
      });
      continue;
    }

    if (property.strength > maxStrength) {
      warnings.push({
        code: "STYLE-PROFILE-CAPABILITY-001",
        humanReadableMessage: "High style strength is a preference, not a guarantee.",
        path: `/properties/${key}/strength`,
        property: key,
        severity: "info",
        technicalDetails: `Property "${key}" strength ${property.strength} exceeds recommended capability strength ${maxStrength}.`
      });
    }
  }

  if (profile.referenceVideo.width !== 1080 || profile.referenceVideo.height !== 1920) {
    warnings.push({
      code: "STYLE-PROFILE-CAPABILITY-001",
      humanReadableMessage: "Reference video dimensions differ from the V1 output target.",
      path: "/referenceVideo",
      severity: "info",
      technicalDetails: `Reference video is ${profile.referenceVideo.width}x${profile.referenceVideo.height}; V1 output target is 1080x1920.`
    });
  }

  return warnings;
}
