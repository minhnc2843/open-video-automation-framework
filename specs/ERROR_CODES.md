# Error Codes

## Purpose

Source of truth for framework error codes. Phase 01 defines only the skeleton needed by shared contracts and configuration.

## Format

Use stable, searchable codes:

```text
DOMAIN-AREA-NNN
```

## Current codes

| Code | Category | Severity | Meaning |
|---|---|---|---|
| `CONFIG-ENV-001` | configuration | fatal | Runtime environment validation failed. |
| `CONFIG-ENV-002` | configuration | fatal | Runtime environment contains a secret or unsupported value that cannot be safely accepted. Reserved for config hardening. |
| `CONTRACT-001` | contract | error | Public contract violation. Reserved for later contract validation. |
| `EVENT-001` | event | error | Invalid domain event shape. Reserved for later event validation. |
| `SCRIPT-SCHEMA-001` | validation | error | JSON Script failed structural JSON Schema validation. |
| `SCRIPT-SEMANTIC-001` | validation | error | Total scene duration does not match configured duration. |
| `SCRIPT-SEMANTIC-002` | validation | error | Voice is enabled but scene voice text is missing. |
| `SCRIPT-SEMANTIC-003` | validation | error | Subtitle is enabled but no subtitle text can be derived. |
| `SCRIPT-SEMANTIC-004` | validation | error | Layer ids are not unique within a scene. |
| `SCRIPT-ASSET-001` | validation | error | Referenced asset does not exist in the provided asset set. |
| `TIMELINE-TIME-001` | validation | error | Timeline scenes overlap. |
| `TIMELINE-TIME-002` | validation | error | Timeline scene or total duration overflows configured duration. |
| `TIMELINE-TIME-003` | validation | error | Timeline scene has invalid timing or frame boundaries. |
| `ASSET-HASH-001` | storage | error | Asset hashing failed or could not read the asset file. |
| `ASSET-PATH-001` | storage | error | Asset storage path could not be derived safely. |
| `CACHE-VALIDATION-001` | storage | warning | Cache entry is missing, stale or invalid. |
| `JOB-STATE-001` | pipeline | error | Job state transition is not allowed. |
| `JOB-STATE-002` | pipeline | error | Job was not found or cannot be claimed by the worker. |
| `LOGGER-REDACTION-001` | storage | warning | Logger redacted sensitive fields from structured details. |
| `RENDERER-HTML-001` | renderer | error | HTML scene document generation failed. |
| `RENDERER-CAPTURE-001` | renderer | error | Playwright Chromium scene capture failed. |
| `RENDERER-CACHE-001` | renderer | warning | Scene render cache was missing or invalid and had to be regenerated. |
| `ENCODER-FFMPEG-001` | renderer | error | FFmpeg command construction or execution failed. |
| `ENCODER-AUDIO-001` | renderer | error | Audio mix inputs are invalid. |
| `OUTPUT-VALIDATION-001` | renderer | error | Encoded MP4 metadata does not match V1 output constraints. |
| `API-REQUEST-001` | validation | error | API request body or route parameter is invalid. |
| `API-NOTFOUND-001` | validation | error | Requested API resource was not found. |
| `API-LOG-001` | storage | error | API could not read requested job logs. |

## Rules

- Do not reuse a code for a different failure.
- Do not include secrets in messages or technical details.
- Add new codes here before using them in public package code.
