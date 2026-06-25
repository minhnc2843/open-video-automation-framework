# Phase 14 — Google Colab Operations

## Goal

Define Google Colab as a temporary heavy-render execution environment with explicit setup, environment checks, sync contracts and resume guidance.

## Scope

- Add Colab operation contracts to `@ovaf/contracts`:
  - environment checks,
  - sync manifest,
  - resume plan.
- Add `@ovaf/colab` package:
  - environment checker with injectable probes,
  - sync manifest builder and validator,
  - default sync file entries,
  - resume planner from persisted render job state,
  - Colab storage layout helper.
- Add Colab setup script.
- Add `docs/COLAB_OPERATIONS.md`.
- Add tests for:
  - healthy/failing environment checks,
  - manifest sorting and validation,
  - unsafe path rejection,
  - resume/start/block decisions.

## Non-goals

- No permanent Colab backend.
- No distributed queue.
- No Google Drive SDK integration.
- No Docker, Kubernetes, Redis or WSL dependency.
- No database migration.
- No real render execution in tests.

## Architecture Rules

- Colab is an execution environment, not the source of truth.
- Durable state remains in SQLite/files under project storage.
- Required project/assets/cache artifacts must be synchronized before resume.
- Logs/output/cache must be synchronized back before ending a Colab session.
- Sync paths must be safe relative paths.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build --workspace @ovaf/colab` passes.
- `npm run check` passes.
- Runtime dependency audit has no vulnerabilities.
