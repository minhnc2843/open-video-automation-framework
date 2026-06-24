# Phase 04 Prompt — Timeline Engine

## Role

Senior Full-Stack Engineer kiêm Software Architect, làm việc theo specification-first.

## Required reading

1. `specs/PROJECT_MEMORY.md`
2. `specs/PROJECT_PRINCIPLES.md`
3. `specs/MASTER_SPEC.md`
4. `architecture/SYSTEM_ARCHITECTURE.md`
5. `specs/AI_RULES.md`
6. `specs/CODING_CONVENTIONS.md`
7. `docs/ROADMAP.md`
8. `schemas/json-script.schema.json`

## Objective

Convert validated JSON Script into deterministic normalized Timeline data.

## In scope

- Timeline TypeScript contracts.
- Script to Timeline transformation.
- Scene start/end seconds and frame boundaries.
- Layer z-index order.
- Voice/subtitle cue derivation.
- Timeline overlap, overflow and invalid boundary checks.
- Deterministic output tests.

## Out of scope

- Raw JSON Script validation.
- Asset resolution/cache.
- Renderer implementation.
- FFmpeg encoding.
- Provider generation.
- API/UI behavior.

## Tests required

- Sequential scene timing and frame boundaries.
- Deterministic output for identical input.
- Layer z-index order.
- Voice/subtitle cue derivation.
- Overflow detection.
- Overlap detection.
- Invalid frame boundary detection.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Valid Script transforms into deterministic Timeline.
- Time overlap/overflow checks are covered by tests.
- Renderer/provider implementation is not added.
