# Google Colab Operations

Phase 14 defines how Colab is used as a temporary render environment. Colab is not the source of truth. Durable state remains in project storage: SQLite metadata, assets, cache, logs and outputs.

## Setup Flow

Run these cells from Google Colab after opening a notebook.

```python
from google.colab import drive
drive.mount("/content/drive")
```

```bash
git clone <your-repo-url> /content/open-video-automation-framework
cd /content/open-video-automation-framework
npm install
npm run build --workspace @ovaf/colab
python colab/setup_colab.py --storage-root /content/ovaf-storage --drive-root /content/drive/MyDrive/ovaf
```

If Node.js is older than 22, install Node.js 22 before `npm install`. If Chromium is missing, prefer Playwright-managed Chromium with `CHROMIUM_PATH` or install a compatible `.deb` browser such as Google Chrome. Avoid Ubuntu `chromium-browser` snap launchers on Colab because they are not usable browser binaries.

## Storage Layout

Use this Colab runtime storage root by default:

```text
/content/ovaf-storage/
├── projects/
├── assets/
├── cache/
├── logs/
├── temp/
└── output/
```

Sync durable files from Drive or another storage location into that runtime folder before running render work. Sync back `logs/`, `output/` and any newly valid `cache/` entries before ending the Colab session.

## Sync Manifest Contract

The sync manifest is the handoff contract between durable storage and Colab runtime storage.

```json
{
  "version": "1.0",
  "id": "sync-job-1",
  "createdAt": "2026-06-25T00:00:00.000Z",
  "direction": "to_colab",
  "sourceRoot": "storage",
  "targetRoot": "/content/ovaf-storage",
  "projectId": "project-1",
  "projectVersionId": "version-1",
  "jobId": "job-1",
  "files": [
    { "kind": "database", "path": "projects/project-store.sqlite", "required": true },
    { "kind": "asset", "path": "assets/", "required": true },
    { "kind": "cache", "path": "cache/", "required": false },
    { "kind": "log", "path": "logs/", "required": false },
    { "kind": "output", "path": "output/", "required": false }
  ]
}
```

Rules:

- `path` must be relative and must not contain `..`.
- Required files must exist before render/resume starts.
- Checksums, when present, must be SHA-256 hex digests.
- `from_colab` manifests should include `logs/`, `output/` and any cache artifacts that should survive the Colab session.

## Resume Flow

Before resuming a job:

1. Sync required `projects/`, `assets/` and relevant `cache/` entries into `/content/ovaf-storage`.
2. Validate the sync manifest with `@ovaf/colab`.
3. Build a resume plan from the persisted render job.
4. If the plan is `blocked`, sync the missing artifacts or return to local storage to repair job state.
5. If the plan is `start` or `resume`, run the worker from the indicated stage.
6. Sync `logs/`, `output/` and new cache entries back to durable storage before closing Colab.

## Non-goals

- Colab does not host a permanent API.
- Colab does not own the SQLite source of truth.
- Phase 14 does not add distributed workers, Redis, Kubernetes, Docker or cloud queue infrastructure.
