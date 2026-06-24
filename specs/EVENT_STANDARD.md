# Event Standard

## Purpose

Source of truth for domain event naming and minimum payload metadata. Phase 01 defines the initial event skeleton only.

## Naming

Use lowercase dotted names:

```text
domain.action
```

Current event names:

- `job.status_changed`
- `pipeline.stage_started`
- `pipeline.stage_completed`
- `pipeline.stage_failed`

## Required metadata

Events may include:

- `jobId`
- `projectId`
- `projectVersionId`
- `sceneId`
- `stage`

Stage names must match the shared contract in `packages/contracts`.

## Limits

Phase 01 does not define full payload schemas yet. Later phases must extend this document before adding event payloads used across package boundaries.
