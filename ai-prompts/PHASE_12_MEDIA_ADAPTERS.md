# Phase 12 — Voice, Subtitle and Music Adapters

## Goal

Add the optional media planning layer for voice, subtitle and music without adding concrete provider SDKs or changing JSON Script schema.

## Scope

- Add public media contracts to `@ovaf/contracts`.
- Extend encoder audio track inputs with optional timing fields:
  - `startSeconds`,
  - `durationSeconds`,
  - `loop`.
- Add `@ovaf/media` package:
  - voice synthesis request builder from Timeline voice cues,
  - subtitle SRT document builder from Timeline subtitle cues,
  - music track plan builder from explicit music source input,
  - combined media plan builder,
  - deterministic media cache keys.
- Update FFmpeg command builder to support timed audio filters and looped input.
- Add tests for toggles, missing music source, cue validation, subtitle formatting, cache stability and timed FFmpeg switches.

## Non-goals

- No concrete TTS, subtitle or music provider.
- No provider credential handling.
- No media API endpoints.
- No JSON Script schema change for music source.
- No binary audio synthesis.
- No real FFmpeg execution in tests.

## Architecture Rules

- Media adapters consume Timeline and explicit adapter inputs.
- Renderer remains provider-agnostic.
- Provider plugins remain UI-agnostic.
- Cache keys must be deterministic and derived from normalized inputs.
- Errors must use `MEDIA-*` framework codes.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build --workspace @ovaf/media` passes.
- `npm run check` passes.
- Runtime dependency audit has no vulnerabilities.
