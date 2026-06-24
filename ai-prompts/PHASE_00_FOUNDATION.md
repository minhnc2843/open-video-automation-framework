# Phase 00 Prompt — Foundation and Repository Governance

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
8. ADR liên quan trong `adr/`

## Objective

Thiết lập repository skeleton, documentation hierarchy và npm workspaces baseline để các phase sau có điểm tựa ổn định.

## In scope

- Root npm workspace.
- Placeholder directories for `apps/`, `packages/`, `contracts/`, `schemas/`, `examples/`, `tests/`, `scripts/` and `storage/`.
- Governance docs and onboarding links.
- Baseline verification script.

## Out of scope

- Business logic.
- JSON Script schema.
- TypeScript public contracts.
- Database schema or migrations.
- Renderer, provider, API or UI implementation.
- Docker, WSL, Redis, Kafka, Kubernetes or cloud queue.

## Files allowed to create/change

- `package.json`
- `package-lock.json`
- Workspace placeholder `package.json` and `README.md` files.
- `scripts/check-workspace.mjs`
- Governance docs under `docs/`, `specs/`, `ai-prompts/`, `templates/`.
- Runtime storage placeholder files.
- `.gitignore`

## Contracts and schemas affected

None. Phase 00 creates placeholder directories only.

## Implementation requirements

- Root package must be private.
- Workspaces must include `apps/*` and `packages/*`.
- No runtime dependencies are required in Phase 00.
- Storage runtime outputs must remain ignored by Git.

## Validation and error handling

The baseline check must fail clearly when a required workspace or source-of-truth file is missing.

## Tests required

- `npm install`
- `npm run check`
- `npm test`

## Windows commands to verify

Run from repository root in PowerShell or Command Prompt:

```powershell
npm install
npm run check
npm test
```

## Definition of Done

- Repository clone can install on Windows.
- `npm install` succeeds.
- `npm run check` succeeds.
- README and Start Here link to required docs.
- No business logic is added.
