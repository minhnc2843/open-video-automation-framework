# Phase 02 Prompt — SQLite, Migrations and Project Persistence

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
8. `adr/ADR-004-PERSISTENCE-ADAPTER-PACKAGE.md`

## Objective

Tạo SQLite schema, migration command và persistence repository cho workspace, project, immutable project version và render job metadata.

## In scope

- SQLite migration `0001_initial_project_persistence`.
- Migration tracking table.
- Project persistence TypeScript contracts.
- Typed repository methods.
- Tests for fresh migration, CRUD and immutable version snapshots.

## Out of scope

- JSON Script schema validation.
- Asset/cache persistence.
- Worker queue execution.
- API routes.
- Provider credentials.
- Renderer implementation.

## Files allowed to create/change

- `packages/contracts/**`
- `packages/config/**`
- `packages/persistence/**`
- `adr/ADR-004-PERSISTENCE-ADAPTER-PACKAGE.md`
- `ai-prompts/PHASE_02_PERSISTENCE.md`
- root `package.json`, `tsconfig.json`, `scripts/check-workspace.mjs`
- README/docs links when needed.

## Contracts and schemas affected

- Adds TypeScript persistence record contracts.
- Adds SQLite database schema migration.
- Does not add JSON Script schema.

## Tests required

- Fresh migration works.
- Migration is idempotent.
- Workspace/project/version/job CRUD works.
- Project version snapshots cannot be updated after creation.

## Windows commands to verify

Run from repository root in PowerShell or Command Prompt:

```powershell
npm install
npm run check
npm run db:migrate
```

## Definition of Done

- Fresh database migration works on Windows.
- CRUD and immutable version snapshot tests pass.
- No provider/render implementation exists.
