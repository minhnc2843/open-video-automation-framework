# Reference Video Package

Reference video metadata and Style Profile validation primitives for Phase 13.

This package does not upload files, call video-analysis providers or instruct the renderer directly. It validates metadata and style profiles that can later be stored in `styleProfileSnapshot`.

## Responsibilities

- Validate reference video upload metadata.
- Validate Style Profile JSON against `schemas/style-profile.schema.json`.
- Enforce semantic control rules for per-property `enabled` and `strength` values.
- Generate capability warnings for unsupported or high-strength style preferences.

## Limits

- No API routes.
- No persistence migration.
- No concrete provider SDK.
- No face/person recognition.
- No guarantee of exact style reproduction.
