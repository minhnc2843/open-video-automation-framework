# Colab Package

Google Colab operation checks, sync manifests and resume planning for Phase 14.

This package does not start a remote backend or execute the render pipeline. It provides deterministic primitives for Colab notebooks and scripts.

## Responsibilities

- Check Colab or Colab-compatible runtime dependencies.
- Build and validate sync manifests for project, asset, cache, log and output files.
- Build resume plans from persisted render job state and synchronized artifacts.

## Limits

- No cloud queue.
- No API routes.
- No Google Drive SDK integration.
- No database migration.
- No actual file copy implementation in Phase 14.
