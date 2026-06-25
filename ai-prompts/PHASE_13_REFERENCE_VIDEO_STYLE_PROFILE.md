# Phase 13 — Reference Video Style Profile

## Goal

Add the Reference Video Style Profile boundary so future analysis providers can return reviewable style preferences without coupling renderer, UI or core pipeline to provider-specific output.

## Scope

- Add `schemas/style-profile.schema.json`.
- Add public Reference Video and Style Profile contracts to `@ovaf/contracts`.
- Add `@ovaf/reference-video` package:
  - reference video metadata validation,
  - Style Profile schema validation,
  - semantic validation for per-property controls,
  - Style Profile builder with default disabled controls,
  - capability warning generation.
- Add `STYLE-PROFILE-*` and `REFERENCE-VIDEO-*` error codes.
- Add tests for:
  - valid and invalid upload metadata,
  - schema validation failure,
  - semantic control validation,
  - capability warnings for unsupported properties,
  - high-strength preferences,
  - reference video dimension mismatch.

## Non-goals

- No upload API route.
- No database migration.
- No concrete reference-analysis provider.
- No face/person recognition.
- No direct renderer instruction output.
- No guarantee of exact reproduction from a high strength value.

## Architecture Rules

- Reference analysis produces a Style Profile, not renderer instructions.
- Every style category has `enabled` and `strength`.
- Disabled properties must have strength `0`.
- Enabled properties require a human-reviewable summary.
- Capability warnings must make unsupported or high-strength preferences explicit.
- The existing `styleProfileSnapshot` project version field can store validated snapshots without migration.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build --workspace @ovaf/reference-video` passes.
- `npm run check` passes.
- Runtime dependency audit has no vulnerabilities.
