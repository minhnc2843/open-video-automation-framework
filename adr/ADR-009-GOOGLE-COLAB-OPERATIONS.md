# ADR-009: Google Colab Operations Boundary

## Status

Accepted

## Context

The project is Windows-first but uses Google Colab as the default heavy-render execution environment. Colab sessions are temporary and must not become the source of truth. Project versions, assets, cache, logs and outputs need a documented sync and resume workflow.

Phase 14 needs operational contracts and setup guidance without adding a cloud backend, distributed worker or provider-specific execution path.

## Decision

- Add Colab operation contracts to `@ovaf/contracts`.
- Add `@ovaf/colab` for environment checks, sync manifest validation and resume planning.
- Add a Colab setup script and operations documentation.
- Treat sync manifests as the explicit contract for moving project, asset, cache, log and output files between durable storage and Colab runtime storage.
- Keep Colab as an execution environment only. Durable truth remains SQLite/files in project storage.

## Consequences

- Colab setup can be checked before expensive render work starts.
- Resume decisions can be made from persisted job state and synchronized artifacts.
- Future notebooks or worker commands can consume the same sync/resume contracts.
- Phase 14 does not introduce a remote backend, queue service, API route or database migration.
