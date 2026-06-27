export const SAMPLE_JSON_SCRIPT = `{
  "version": "1.0",
  "project": {
    "name": "Animated deterministic short",
    "language": "en"
  },
  "settings": {
    "aspectRatio": "9:16",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "maxDurationSeconds": 10,
    "voiceEnabled": false,
    "musicEnabled": false,
    "subtitleEnabled": false
  },
  "scenes": [
    {
      "id": "animated-scene-001",
      "durationSeconds": 5,
      "transition": {
        "name": "fade",
        "durationMs": 800
      },
      "layers": [
        {
          "id": "bg-001",
          "type": "background",
          "source": {
            "kind": "color",
            "value": "#102a43"
          }
        },
        {
          "id": "text-hook",
          "type": "text",
          "content": "Motion should be measured frame by frame.",
          "animation": [
            {
              "name": "fade",
              "startMs": 0,
              "durationMs": 1200,
              "easing": "ease-out"
            },
            {
              "name": "slide-up",
              "startMs": 0,
              "durationMs": 5000,
              "easing": "ease-out"
            }
          ]
        }
      ]
    },
    {
      "id": "animated-scene-002",
      "durationSeconds": 5,
      "transition": {
        "name": "fade",
        "durationMs": 800
      },
      "layers": [
        {
          "id": "bg-002",
          "type": "background",
          "source": {
            "kind": "color",
            "value": "#f5f0d8"
          }
        },
        {
          "id": "text-shift",
          "type": "text",
          "content": "Time is injected. Frames are captured sequentially.",
          "animation": {
            "name": "slide-left",
            "startMs": 0,
            "durationMs": 5000,
            "easing": "ease-out"
          }
        }
      ]
    }
  ]
}`;
