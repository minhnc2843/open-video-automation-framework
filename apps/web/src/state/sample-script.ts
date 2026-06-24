export const SAMPLE_JSON_SCRIPT = `{
  "version": "1.0",
  "project": {
    "name": "Launch teaser",
    "language": "vi"
  },
  "settings": {
    "aspectRatio": "9:16",
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "maxDurationSeconds": 18,
    "voiceEnabled": false,
    "musicEnabled": false,
    "subtitleEnabled": true
  },
  "scenes": [
    {
      "id": "scene-001",
      "durationSeconds": 6,
      "layers": [
        {
          "id": "bg-001",
          "type": "background",
          "source": {
            "kind": "color",
            "value": "#f5f5f0"
          }
        },
        {
          "id": "text-001",
          "type": "text",
          "content": "Mo dau nhanh, ro y"
        }
      ]
    },
    {
      "id": "scene-002",
      "durationSeconds": 8,
      "layers": [
        {
          "id": "bg-002",
          "type": "background",
          "source": {
            "kind": "color",
            "value": "#0f766e"
          }
        },
        {
          "id": "text-002",
          "type": "text",
          "content": "Noi dung chinh duoc chia theo scene"
        }
      ]
    }
  ]
}`;
