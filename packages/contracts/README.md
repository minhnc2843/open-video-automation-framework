# Contracts Package

Shared TypeScript contract skeleton for Phase 01.

Included now:

- runtime constants for fixed V1 constraints;
- error descriptor skeleton;
- job status, pipeline stage and domain event skeleton.
- persistence records for workspace, project, immutable project version and render job metadata.
- JSON Script TypeScript types that mirror the schema source of truth.
- Timeline contracts consumed by renderer-facing packages.
- asset and cache metadata contracts.
- structured log records and job state transition contracts.
- HTML renderer input/output contracts.
- FFmpeg encoder and MP4 validation contracts.
- API request/response contracts for Phase 09 routes.

Not included yet:

- JSON Script schema;
- provider contract;
- concrete renderer implementation contract;
- database contract.

Those belong to later phases unless an approved ADR changes the roadmap. Public contract changes require ADR/proposal review.
