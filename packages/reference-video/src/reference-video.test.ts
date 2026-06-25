import { describe, expect, it } from "vitest";
import type { ReferenceVideoMetadata, StyleProfilePropertyKey } from "@ovaf/contracts";
import { STYLE_PROFILE_PROPERTY_KEYS } from "@ovaf/contracts";
import { buildStyleProfileCapabilityWarnings } from "./capability-warnings.js";
import { createReferenceVideoMetadata } from "./reference-video-metadata.js";
import { buildStyleProfile } from "./style-profile-builder.js";
import { validateStyleProfile, validateStyleProfileSemantics } from "./style-profile-validator.js";

describe("reference video metadata", () => {
  it("creates valid upload metadata", () => {
    const result = createReferenceVideoMetadata({
      checksumSha256: "a".repeat(64),
      durationSeconds: 12.5,
      fileName: "reference.mp4",
      fps: 30,
      height: 1920,
      id: "reference-1",
      mimeType: "video/mp4",
      sizeBytes: 1024,
      storagePath: "storage/assets/reference.mp4",
      uploadedAt: "2026-06-25T00:00:00.000Z",
      width: 1080
    });

    expect(result).toEqual({
      metadata: {
        checksumSha256: "a".repeat(64),
        durationSeconds: 12.5,
        fileName: "reference.mp4",
        fps: 30,
        height: 1920,
        id: "reference-1",
        mimeType: "video/mp4",
        sizeBytes: 1024,
        storagePath: "storage/assets/reference.mp4",
        uploadedAt: "2026-06-25T00:00:00.000Z",
        width: 1080
      },
      ok: true
    });
  });

  it("rejects invalid upload metadata", () => {
    const result = createReferenceVideoMetadata({
      checksumSha256: "not-a-sha",
      durationSeconds: 0,
      fileName: "",
      height: 0,
      id: "",
      mimeType: "image/png",
      sizeBytes: 0,
      storagePath: "",
      uploadedAt: "not-date",
      width: 0
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(["REFERENCE-VIDEO-METADATA-001"])
      );
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "/referenceVideo/mimeType" }),
          expect.objectContaining({ path: "/referenceVideo/checksumSha256" })
        ])
      );
    }
  });
});

describe("style profile validation", () => {
  it("builds and validates a complete style profile", () => {
    const profile = buildStyleProfile({
      analysisProviderId: "reference-analyzer",
      capabilities: {
        maxStrength: 0.8,
        supportedProperties: ["cameraMovement", "colorPalette"]
      },
      createdAt: "2026-06-25T00:00:00.000Z",
      properties: {
        cameraMovement: {
          enabled: true,
          evidence: ["Slow forward push between 00:00 and 00:03."],
          strength: 0.75,
          summary: "Prefer slow push-in camera motion."
        },
        colorPalette: {
          enabled: true,
          strength: 0.9,
          summary: "Prefer teal highlights with clean neutral backgrounds."
        },
        transitionStyle: {
          enabled: true,
          strength: 0.6,
          summary: "Prefer quick swipe transitions."
        }
      },
      referenceVideo: createMetadata()
    });

    const result = validateStyleProfile(profile);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected Style Profile validation to pass.");
    }
    expect(result.profile.properties.cameraMovement).toMatchObject({
      enabled: true,
      strength: 0.75
    });
    expect(result.profile.properties.motionIntensity).toEqual({
      enabled: false,
      strength: 0,
      summary: ""
    });
    expect(result.profile.warnings).toEqual([
      expect.objectContaining({
        path: "/properties/transitionStyle",
        property: "transitionStyle",
        severity: "warning"
      }),
      expect.objectContaining({
        path: "/properties/colorPalette/strength",
        property: "colorPalette",
        severity: "info"
      })
    ]);
  });

  it("returns schema issues for malformed style profiles", () => {
    const result = validateStyleProfile({
      version: "1.0",
      referenceVideo: createMetadata(),
      properties: {},
      warnings: []
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({
        code: "STYLE-PROFILE-SCHEMA-001"
      });
    }
  });

  it("returns semantic issues for inconsistent controls", () => {
    const profile = buildStyleProfile({
      properties: {
        cameraMovement: {
          enabled: true,
          strength: 0.5,
          summary: ""
        }
      },
      referenceVideo: createMetadata()
    });
    const manuallyBroken = {
      ...profile,
      properties: {
        ...profile.properties,
        motionIntensity: {
          enabled: false,
          strength: 0.5,
          summary: ""
        }
      }
    };

    expect(validateStyleProfileSemantics(manuallyBroken)).toEqual([
      expect.objectContaining({
        code: "STYLE-PROFILE-SEMANTIC-001",
        path: "/properties/cameraMovement/summary"
      }),
      expect.objectContaining({
        code: "STYLE-PROFILE-SEMANTIC-001",
        path: "/properties/motionIntensity/strength"
      })
    ]);
  });

  it("recomputes capability warnings when validating with a capability set", () => {
    const profile = buildStyleProfile({
      properties: {
        lighting: {
          enabled: true,
          strength: 0.95,
          summary: "Prefer dramatic rim lighting."
        }
      },
      referenceVideo: {
        ...createMetadata(),
        height: 1080,
        width: 1920
      }
    });

    const result = validateStyleProfile(profile, {
      capabilities: {
        maxStrength: 0.8,
        supportedProperties: []
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.warnings).toEqual([
        expect.objectContaining({
          path: "/properties/lighting",
          property: "lighting"
        }),
        expect.objectContaining({
          path: "/referenceVideo"
        })
      ]);
    }
  });
});

describe("capability warnings", () => {
  it("does not warn for disabled unsupported properties", () => {
    const profile = buildStyleProfile({
      properties: {
        audioRhythm: {
          enabled: false,
          strength: 1,
          summary: "Ignored because disabled."
        }
      },
      referenceVideo: createMetadata()
    });

    expect(
      buildStyleProfileCapabilityWarnings(profile, {
        supportedProperties: []
      })
    ).toEqual([]);
  });

  it("keeps property keys aligned with schema categories", () => {
    const expected: readonly StyleProfilePropertyKey[] = [
      "cameraMovement",
      "motionIntensity",
      "composition",
      "scenePacing",
      "transitionStyle",
      "textPlacement",
      "colorPalette",
      "lighting",
      "audioRhythm"
    ];

    expect(STYLE_PROFILE_PROPERTY_KEYS).toEqual(expected);
  });
});

function createMetadata(): ReferenceVideoMetadata {
  return {
    checksumSha256: "b".repeat(64),
    durationSeconds: 12,
    fileName: "reference.mp4",
    fps: 30,
    height: 1920,
    id: "reference-1",
    mimeType: "video/mp4",
    sizeBytes: 2048,
    storagePath: "storage/assets/reference.mp4",
    uploadedAt: "2026-06-25T00:00:00.000Z",
    width: 1080
  };
}
