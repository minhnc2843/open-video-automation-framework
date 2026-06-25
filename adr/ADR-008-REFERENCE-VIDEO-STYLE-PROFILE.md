# ADR-008: Reference Video Style Profile

## Status

Accepted

## Context

Phase 13 introduces reference video analysis as a source of style preferences. The project principles require that reference video is used as a style/technical reference, not as a mechanism to copy content, identify people or bypass JSON Script and Timeline control.

The renderer must remain provider-agnostic. Reference analysis may come from future providers, but its output needs a stable, reviewable contract that the UI and pipeline can inspect before applying.

## Decision

- Add `style-profile.schema.json` as the JSON Schema source of truth for Style Profile snapshots.
- Add Reference Video metadata and Style Profile contracts to `@ovaf/contracts`.
- Add `@ovaf/reference-video` to validate upload metadata, validate Style Profile snapshots and generate capability warnings.
- Require every style category to expose per-property `enabled` and `strength` controls.
- Treat high strength as preference strength, not a guarantee of exact reproduction.
- Do not add upload API routes, database migrations or concrete video analysis providers in Phase 13.

## Consequences

- Project versions can keep using the existing `styleProfileSnapshot` JSON field without a database migration.
- Future UI/API work can persist validated Style Profile snapshots without inventing a new shape.
- Capability warnings make unsupported or high-strength style requests explicit before render.
- Any future schema change for Style Profile remains a public contract change and needs compatibility review.
