# Phase 09 Prompt — API Layer

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
8. API contracts in `packages/contracts`

## Objective

Create the Fastify API boundary for project metadata, JSON Script validation, render jobs and job logs.

## In scope

- Fastify app factory.
- Typed route contracts.
- Request boundary validation.
- Project/workspace/version routes backed by persistence.
- Script validation route backed by validator package.
- Job create/read routes backed by persistence.
- Job log read route.
- Tests with `server.inject()`.

## Out of scope

- Authentication/authorization.
- Worker execution triggers.
- Provider management.
- File uploads.
- Web UI.
- OpenAPI generation beyond typed route contracts.

## Tests required

- Health route works.
- Project metadata routes create/read records.
- Script validation route returns issues for invalid scripts.
- Job routes create/read queued jobs.
- Log route reads JSONL lines and handles missing logs.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Fastify app compiles.
- Route tests pass through injection.
- Controllers do not run long render work synchronously.
