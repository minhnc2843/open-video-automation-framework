# ADR-005: Add FFmpeg Encoder Adapter Package

- **Status:** Accepted
- **Date:** 2026-06-24
- **Owners:** Project maintainers

## Context

Phase 08 requires frame/scene encoding, audio mixing switches and MP4 output validation. The architecture treats FFmpeg encoding as a concrete adapter boundary, not core pipeline logic. Placing FFmpeg command construction inside `packages/core` would couple the pipeline to one encoder implementation, while placing it inside `packages/renderer-html` would blur renderer and encoder responsibilities.

## Decision

Add `packages/encoder-ffmpeg` as the V1 FFmpeg adapter package.

The package owns:

- FFmpeg command construction.
- Optional audio mix command switches.
- Scene concat manifest generation.
- Process runner boundary.
- FFprobe output metadata validation.

## Alternatives considered

- Put FFmpeg logic in `packages/renderer-html`: rejected because renderer should produce scene outputs for an encoder, not own encoding policy.
- Put FFmpeg logic in `packages/core`: rejected because core must remain adapter-agnostic.
- Add a bundled FFmpeg binary package: deferred because V1 setup should document Windows/Colab FFmpeg rather than committing a binary strategy before operations docs.

## Consequences

- Later phases can call encoder through contracts or composition roots.
- Unit tests can inject fake process runners and do not require FFmpeg installed.
- Real Windows/Colab execution still requires `ffmpeg` and `ffprobe` on PATH or configured executable paths.

## Migration / compatibility impact

No existing encoder package exists. This ADR introduces the initial adapter boundary.

## Test and documentation impact

Phase 08 tests must cover command construction and MP4 metadata validation using injected runners.
