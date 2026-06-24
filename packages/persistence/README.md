# Persistence Package

SQLite persistence adapter for Phase 02.

Current scope:

- workspace records;
- project records;
- immutable project version snapshots;
- render job metadata;
- migration tracking.

Out of scope:

- JSON Script validation;
- API routes;
- worker execution;
- provider secrets;
- render cache records.

## Windows commands

Run from the repository root:

```powershell
npm run typecheck
npm test
npm run db:migrate
```

`npm run db:migrate` uses `APP_DATABASE_PATH` when provided, otherwise `storage/projects/project-store.sqlite`.

## SQLite adapter note

This package uses Node's built-in `node:sqlite` module to avoid native npm build dependencies in V1. On current Node versions this may print an experimental warning; see `adr/ADR-004-PERSISTENCE-ADAPTER-PACKAGE.md`.
