# ADR-007: Voice, Subtitle and Music Adapter Package

## Status

Accepted

## Context

Phase 12 adds optional voice, subtitle and music planning. These features depend on Timeline timing, provider-generated assets and FFmpeg audio mixing, but they must not couple the renderer, provider plugins or UI to one another.

The existing `AudioTrackInput` contract supports path and volume only. Scene-level voice needs timing offsets, and music may need loop semantics before it reaches FFmpeg.

## Decision

- Add public media planning contracts to `@ovaf/contracts`.
- Extend `AudioTrackInput` with optional `startSeconds`, `durationSeconds` and `loop` fields. Existing callers remain compatible because the fields are optional.
- Add a new `@ovaf/media` package for voice request planning, subtitle document building, music source planning and media cache fingerprints.
- Keep concrete TTS, subtitle provider and music provider SDKs out of Phase 12.
- Keep JSON Script schema unchanged in Phase 12; music source is supplied as adapter input until the script schema formally adds a source field.

## Consequences

- The encoder can receive timed audio tracks without knowing whether they came from voice, music or another adapter.
- Voice/subtitle/music features can be toggled independently through existing script settings.
- Cache keys are deterministic and can later be persisted or reused by workers.
- Future schema changes for music source or voice profile defaults still require a separate ADR/proposal.
