# Phase 06 Prompt — Job Queue, Worker and Logger

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
8. Persistence and event contracts in `packages/contracts`

## Objective

Create the persisted job state machine, single-worker execution skeleton, structured JSONL logging and resume/retry policy skeleton.

## In scope

- Job transition contracts and state machine.
- Render job status persistence updates.
- Structured log record contracts.
- JSONL logger with secret redaction.
- Single worker that runs injected stage handlers.
- Recoverable retry skeleton.

## Out of scope

- Real render stage implementation.
- Provider calls.
- API endpoints.
- UI progress display.
- Distributed/multi-worker queue.

## Tests required

- Allowed and rejected job transitions.
- Recoverable resume transition.
- Render job persisted status update.
- Logger redacts secrets.
- Worker completes successful jobs.
- Worker marks failed stage as recoverable and increments retry count.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Persisted job state machine works.
- Single worker process skeleton is tested.
- Structured logs contain job/project/stage context and redact secrets.
