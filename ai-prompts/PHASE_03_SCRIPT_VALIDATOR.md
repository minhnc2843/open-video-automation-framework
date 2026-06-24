# Phase 03 Prompt — Script Schema and Validator

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
8. `adr/ADR-003-JSON-SCRIPT.md`

## Objective

Tạo JSON Script schema và validator chặn render khi input sai cấu trúc hoặc vi phạm semantic rules V1.

## In scope

- `schemas/json-script.schema.json` as source of truth.
- Validator package using JSON Schema structural validation.
- Semantic validation for V1 fixed video constraints, duration matching, voice/subtitle requirements, duplicate layer ids and asset existence.
- Error codes and tests.

## Out of scope

- Timeline transformation.
- Renderer behavior.
- Provider credentials validation.
- Full asset manager implementation.
- UI editor.

## Contracts and schemas affected

- Adds JSON Script schema v1.0.
- Adds validator result contract inside validator package.
- Adds script validation error codes.

## Tests required

- Valid script passes.
- Invalid aspect ratio fails with JSON path.
- Total duration mismatch fails.
- Voice enabled without voice text fails.
- Subtitle enabled without derivable text fails.
- Duplicate layer id fails.
- Missing asset reference fails.

## Windows commands to verify

Run from repository root in PowerShell or Command Prompt:

```powershell
npm install
npm run check
```

## Definition of Done

- Invalid scripts block rendering.
- Errors point to JSON path and rule.
- No timeline/render/provider implementation is added.
