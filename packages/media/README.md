# Media Package

Voice, subtitle and music adapter primitives for Phase 12.

This package turns a valid Timeline into a media plan. It does not call external TTS/music providers and does not render video.

## Responsibilities

- Build voice synthesis requests from Timeline voice cues.
- Build deterministic subtitle documents from Timeline subtitle cues.
- Build music track plans from explicit music source input.
- Convert generated voice assets and music sources into timed encoder audio tracks.
- Derive deterministic cache keys for voice, subtitle, music and combined media plans.

## Limits

- No concrete provider SDKs.
- No credential handling.
- No API routes.
- No JSON Script schema change for music source in Phase 12.
- No binary audio generation.

Music source must be provided to the adapter when `timeline.settings.musicEnabled` is true.
