import { describe, expect, it } from "vitest";
import { validateJsonScript } from "./json-script-validator.js";

const validScript = {
  version: "1.0",
  project: {
    name: "Example video",
    language: "vi"
  },
  settings: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    maxDurationSeconds: 5,
    voiceEnabled: true,
    musicEnabled: false,
    subtitleEnabled: true
  },
  scenes: [
    {
      id: "scene-001",
      durationSeconds: 5,
      layers: [
        {
          id: "bg-001",
          type: "background",
          source: {
            kind: "color",
            value: "#101010"
          }
        },
        {
          id: "text-001",
          type: "text",
          content: "Noi dung scene dau tien"
        }
      ],
      voice: {
        text: "Noi dung scene dau tien"
      }
    }
  ]
} as const;

describe("validateJsonScript", () => {
  it("accepts a valid V1 vertical JSON Script", () => {
    const result = validateJsonScript(validScript);

    expect(result.ok).toBe(true);
  });

  it("rejects schema violations with a JSON path", () => {
    const result = validateJsonScript({
      ...validScript,
      settings: {
        ...validScript.settings,
        aspectRatio: "16:9"
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({
        code: "SCRIPT-SCHEMA-001",
        path: "/settings/aspectRatio"
      });
    }
  });

  it("rejects total duration mismatch", () => {
    const result = validateJsonScript({
      ...validScript,
      settings: {
        ...validScript.settings,
        maxDurationSeconds: 6
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SCRIPT-SEMANTIC-001",
          path: "/scenes"
        })
      );
    }
  });

  it("rejects missing voice text when voice is enabled", () => {
    const result = validateJsonScript({
      ...validScript,
      scenes: [
        {
          ...validScript.scenes[0],
          voice: undefined
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SCRIPT-SEMANTIC-002",
          path: "/scenes/0/voice/text",
          sceneId: "scene-001"
        })
      );
    }
  });

  it("rejects missing subtitle text when subtitles are enabled", () => {
    const result = validateJsonScript({
      ...validScript,
      settings: {
        ...validScript.settings,
        voiceEnabled: false,
        subtitleEnabled: true
      },
      scenes: [
        {
          id: "scene-001",
          durationSeconds: 5,
          layers: [
            {
              id: "bg-001",
              type: "background",
              source: {
                kind: "color",
                value: "#101010"
              }
            }
          ]
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SCRIPT-SEMANTIC-003",
          sceneId: "scene-001"
        })
      );
    }
  });

  it("rejects duplicate layer ids", () => {
    const result = validateJsonScript({
      ...validScript,
      scenes: [
        {
          ...validScript.scenes[0],
          layers: [
            validScript.scenes[0].layers[0],
            {
              ...validScript.scenes[0].layers[1],
              id: "bg-001"
            }
          ]
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SCRIPT-SEMANTIC-004",
          path: "/scenes/0/layers/1/id"
        })
      );
    }
  });

  it("rejects missing referenced assets", () => {
    const result = validateJsonScript({
      ...validScript,
      settings: {
        ...validScript.settings,
        voiceEnabled: false,
        subtitleEnabled: false
      },
      scenes: [
        {
          id: "scene-001",
          durationSeconds: 5,
          layers: [
            {
              id: "image-001",
              type: "image",
              source: {
                kind: "asset",
                path: "assets/missing.png"
              }
            }
          ]
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "SCRIPT-ASSET-001",
          path: "/scenes/0/layers/0/source/path"
        })
      );
    }
  });
});
