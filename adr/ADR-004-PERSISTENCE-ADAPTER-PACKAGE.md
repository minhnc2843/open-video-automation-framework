# ADR-004: Add Persistence Adapter Package

- **Status:** Accepted
- **Date:** 2026-06-24
- **Owners:** Project maintainers

## Context

Phase 02 requires SQLite schema, migrations and project persistence. The architecture keeps `packages/core` independent from concrete infrastructure, so placing SQLite code inside core would make the core pipeline harder to replace or test.

## Decision

Add `packages/persistence` as the V1 SQLite adapter package for workspace, project, project version and render job persistence.

The package owns:

- SQLite migration definitions.
- Migration runner.
- Typed repository methods.
- Persistence tests.

Core packages may depend on persistence contracts later through interfaces, but core must not directly depend on SQLite implementation details.

## Alternatives considered

- Put SQLite code in `packages/core`: rejected because it violates the dependency boundary.
- Put SQLite code in `apps/api`: rejected because Colab/CLI workers also need persistence without HTTP API.
- Add a cloud database adapter now: rejected as outside V1 scope.

## Consequences

- The repository gains one adapter package outside the original Phase 00 placeholder list.
- Concrete SQLite code stays replaceable in later phases.
- Phase 02 can test migrations and repository behavior without adding API or worker implementation.

## Migration / compatibility impact

No existing database exists yet. This ADR introduces migration `0001_initial_project_persistence`.

## Test and documentation impact

Phase 02 tests must verify fresh migration, CRUD and immutable project version snapshots.
