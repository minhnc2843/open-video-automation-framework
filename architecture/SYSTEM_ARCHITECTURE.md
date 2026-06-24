# System Architecture

## Purpose

Mô tả ranh giới module, hướng phụ thuộc và luồng dữ liệu của V1. Đây là tài liệu kiến trúc; schema chi tiết và API contract phải nằm ở thư mục source of truth riêng.

## High-level diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                            Web UI                                │
│ React + Vite: projects, script editor, provider settings, logs  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / SSE or polling
┌──────────────────────────────▼──────────────────────────────────┐
│                             API                                  │
│ Fastify: auth boundary later, project/job/provider endpoints     │
└───────┬───────────────────┬──────────────────────┬──────────────┘
        │                   │                      │
        ▼                   ▼                      ▼
┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐
│ Project Repo │    │ Provider Manager│    │ Job Queue / Worker   │
│ SQLite/files │    │ plugin registry │    │ state machine        │
└──────┬───────┘    └───────┬─────────┘    └──────────┬───────────┘
       │                    │                           │
       ▼                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Core Pipeline                           │
│ validate → timeline → assets → render → encode → output validate │
└──────┬────────────────┬────────────────┬────────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌────────────┐  ┌────────────────┐  ┌────────────────────────────┐
│ Validator  │  │ Asset Manager  │  │ HTML Renderer               │
│ Zod/schema │  │ hash + cache   │  │ Playwright + FFmpeg         │
└────────────┘  └────────────────┘  └────────────────────────────┘
       │                │                │
       └────────────────┴────────────────┴───────────────┐
                                                            ▼
                                               ┌────────────────────┐
                                               │ Storage / Logs      │
                                               │ SQLite + filesystem │
                                               └────────────────────┘
```

## Modules and responsibilities

### Web UI

Responsibilities:

- Render user interface.
- Collect structured input.
- Display validation errors, progress and logs.
- Trigger API calls.

Must not:

- Perform render logic.
- Encrypt/decrypt secrets.
- Know provider implementation internals.
- Contain business rules beyond presentation validation.

### API

Responsibilities:

- Expose project, job, provider and asset endpoints.
- Authenticate/authorize in future phases.
- Validate request boundary.
- Dispatch commands to application services.

Must not:

- Implement renderer logic in controllers.
- Perform long render synchronously in request lifecycle.
- Leak secrets or stack traces.

### Core Pipeline

Responsibilities:

- Orchestrate stages.
- Enforce state machine.
- Emit domain events.
- Call module interfaces, not concrete infrastructure.

Must not:

- Import React/Fastify.
- Depend directly on Gemini/OpenAI/etc.
- Write HTML/CSS scene internals.

### Validator

Responsibilities:

- Validate Script and settings against schema and semantic rules.
- Return detailed field/path errors.
- Block invalid jobs before render.

### Timeline

Responsibilities:

- Convert valid Script to normalized timing/layer instructions.
- Detect illegal overlap/overflow.
- Produce deterministic output from deterministic input.

### Asset Manager

Responsibilities:

- Resolve local, remote and generated assets.
- Compute hash/fingerprint.
- Maintain cache metadata.
- Verify file integrity before reuse.

### Provider Manager

Responsibilities:

- Register provider plugins.
- Route normalized requests.
- Health check, retry and fallback policy.
- Normalize external errors.

### HTML Renderer

Responsibilities:

- Build scene document from Timeline.
- Run Chromium capture.
- Render only invalidated scenes.
- Produce frame/scene output for encoder.

### FFmpeg Encoder

Responsibilities:

- Encode/merge frames/scenes.
- Mix/cut audio tracks.
- Validate output properties.

### Job Queue and Worker

Responsibilities:

- Persist job state.
- Lock project version.
- Execute pipeline asynchronously.
- Resume recoverable jobs.

### Logger

Responsibilities:

- Structured logs.
- Error code mapping.
- Redaction.
- Queryable stage/scene/job context.

## Dependency rules

```text
web → api → application/core → contracts
api → infrastructure adapters → contracts
provider plugins → contracts
renderer → contracts + timeline output
core → contracts only; not concrete provider/renderer implementations
```

Dependencies must point inward toward contracts/core. Concrete adapters can be replaced without changing core pipeline semantics.

## Job state machine

```text
queued
  → validating
  → preparing
  → generating_assets
  → rendering
  → encoding
  → validating_output
  → completed

Any non-final state → failed | cancelled | paused | recoverable
recoverable → preparing | generating_assets | rendering | encoding
```

State transition must be explicit and auditable. No direct mutation from `queued` to `completed`.

## Persistence model

SQLite stores metadata, versions, job states, cache records and log indexes. Large binary assets, render frames and MP4 outputs are stored on disk under `storage/`, referenced by stable metadata records.

## Google Colab boundary

Colab acts as an execution environment for renderer/worker scripts. It does not become a permanent source of truth. Project version, required assets, logs and outputs must be syncable to durable storage before/after a Colab session.
