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

## Rules

- Do not reuse a code for a different failure.
- Do not include secrets in messages or technical details.
- Add new codes here before using them in public package code.
