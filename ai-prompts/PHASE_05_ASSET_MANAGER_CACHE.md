# Phase 05 Prompt — Asset Manager and Cache

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
8. Timeline contracts in `packages/contracts`

## Objective

Create asset and cache primitives used by later render and provider phases.

## In scope

- Asset record creation from local files.
- SHA-256 hashing for files and JSON inputs.
- Stable local storage path derivation.
- Cache entry read/write and validity checks.
- Deterministic scene input fingerprint.

## Out of scope

- Provider generation.
- Renderer integration.
- Database-backed cache records.
- Remote asset download.
- Media probing/transcoding.

## Tests required

- File hashing is deterministic.
- Asset records include hash, size and local storage path.
- Cache validation detects valid, stale and missing entries.
- Scene input fingerprint changes when scene/assets/settings/generator version change.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Asset/cache primitives compile.
- Cache validity checks are covered by tests.
- Scene input fingerprint is deterministic.
