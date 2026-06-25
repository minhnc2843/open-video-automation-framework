# Phase 15 — Testing, Benchmark and Release Preparation

## Goal

Close the V1 baseline with a repeatable acceptance path, basic benchmark, example fixture and release/contribution docs.

## Scope

- Add a valid example JSON Script fixture.
- Add a repository-level integration smoke test covering:
  - JSON Script validation,
  - Timeline build,
  - Style Profile validation,
  - media planning,
  - scene HTML generation,
  - FFmpeg command construction,
  - API project/version/job metadata,
  - Colab sync/resume planning.
- Add a dry-run render benchmark script.
- Add root npm scripts:
  - `test:integration`,
  - `benchmark:render`,
  - `acceptance`.
- Add contributing guide.
- Add release checklist.
- Add GitHub issue and PR templates.

## Non-goals

- No real Chromium capture.
- No real FFmpeg encode.
- No cloud runner.
- No provider SDK integration.
- No release publishing automation.

## Architecture Rules

- Acceptance tests must be deterministic and runnable on Windows without Docker.
- Benchmark must be dry-run unless explicit render dependencies are configured in a future phase.
- Example fixtures must remain valid against the source-of-truth schemas.
- Release docs must call out ADR requirements for public contract/schema/database changes.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run test:integration` passes.
- `npm run benchmark:render` passes.
- `npm run check` passes.
- `npm run acceptance` passes.
- `npm audit` has no vulnerabilities.
