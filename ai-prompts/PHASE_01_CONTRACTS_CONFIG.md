# Phase 01 Prompt — Shared Contracts and Configuration

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
8. `ai-prompts/PHASE_00_FOUNDATION.md`

## Objective

Tạo shared TypeScript contracts, typed runtime config loader, error/event skeleton và environment validation.

## In scope

- TypeScript strict build baseline.
- Shared runtime/error/event contract skeleton.
- Config loader with environment validation.
- Error code and event standard source-of-truth skeleton docs.
- Tests for config validation.

## Out of scope

- JSON Script schema.
- Provider implementation.
- Renderer implementation.
- API/UI implementation.
- SQLite schema or migrations.
- Secret encryption implementation.

## Files allowed to create/change

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `packages/contracts/**`
- `packages/config/**`
- `specs/ERROR_CODES.md`
- `specs/EVENT_STANDARD.md`
- `ai-prompts/PHASE_01_CONTRACTS_CONFIG.md`
- README/docs links when needed.

## Contracts and schemas affected

- Adds initial TypeScript contracts in `packages/contracts`.
- Does not add or change JSON Schema.

## Implementation requirements

- TypeScript strict mode.
- No `any`.
- No provider-specific or renderer-specific implementation.
- Do not expose raw `APP_ENCRYPTION_KEY` through returned config.
- Config validation errors must use framework error descriptors.

## Tests required

- Config loads development defaults.
- Config rejects invalid port.
- Config rejects production without encryption key.
- Config validation details do not include secret values.

## Windows commands to verify

Run from repository root in PowerShell or Command Prompt:

```powershell
npm install
npm run check
npm run typecheck
npm test
```

## Definition of Done

- Contracts compile.
- Config rejects invalid environment.
- Tests pass.
- No provider/render implementation exists.
