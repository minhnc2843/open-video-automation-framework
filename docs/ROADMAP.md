# Roadmap

## Nguyên tắc triển khai

Mỗi phase phải có prompt riêng, scope rõ ràng, test, review và Definition of Done. Không chuyển phase tiếp theo khi phase hiện tại chưa được xác nhận đạt.

## Phase 00 — Foundation and repository governance

Deliverables:

- Repository skeleton.
- Documentation hierarchy.
- AI rules, coding conventions, ADR template.
- npm workspaces baseline.

Definition of Done:

- Repository clone được trên Windows.
- `npm install` chạy được.
- README và Start Here dẫn đúng tài liệu.
- Không có business logic.

## Phase 01 — Shared contracts and configuration

Deliverables:

- Shared TypeScript contracts.
- Typed config loader.
- Error/event skeleton.
- Environment validation.

Definition of Done:

- Contracts compile.
- Config rejects invalid environment.
- No provider/render implementation yet.

## Phase 02 — SQLite, migrations and project persistence

Deliverables:

- SQLite schema.
- Project/workspace/version/job persistence.
- Migration command.
- Repository tests.

Definition of Done:

- Fresh database migration works on Windows.
- CRUD and immutable version snapshot tests pass.

## Phase 03 — Script schema and validator

Deliverables:

- JSON Schema.
- Zod validation.
- Semantic validation for 9:16, <60s, scene duration, voice/subtitle rules.
- Error codes.

Definition of Done:

- Invalid scripts block rendering.
- Errors point to JSON path and rule.

## Phase 04 — Timeline engine

Deliverables:

- Script → Timeline transformation.
- Time overlap/overflow checks.
- Deterministic output tests.

## Phase 05 — Asset manager and cache

Deliverables:

- Asset records, hashing, local storage paths.
- Cache validity checks.
- Scene input fingerprint.

## Phase 06 — Job queue, worker and logger

Deliverables:

- Persisted job state machine.
- Single worker process.
- Structured log records.
- Resume/retry policy skeleton.

## Phase 07 — HTML scene renderer

Deliverables:

- Scene document generator.
- Playwright Chromium capture.
- Per-scene preview.
- Scene cache integration.

## Phase 08 — FFmpeg encoder and output validation

Deliverables:

- Frame/scene encoding.
- Audio mixing switches.
- MP4 metadata validation.

## Phase 09 — API layer

Deliverables:

- Fastify endpoints for projects, validation, jobs, logs.
- OpenAPI or typed route contract.

## Phase 10 — Web UI baseline

Deliverables:

- Project dashboard.
- Script import/edit flow.
- Validation and logs display.
- Render job progress.

Definition of Done:

- React + Vite app builds through npm workspace scripts.
- UI calls typed API client instead of embedding route logic in React components.
- React components remain presentation-focused; workflow orchestration sits in a hook/state module.
- Validation, project version save, job metadata queueing, status refresh and log loading are reachable from the first screen.

## Phase 11 — Provider plugin infrastructure

Deliverables:

- Base provider contract.
- Registry.
- Credentials encryption.
- Health checks, normalized errors.

## Phase 12 — Voice, subtitle and music adapters

Deliverables:

- Optional audio pipeline.
- Voice/subtitle/music feature toggles.
- Caching and timing synchronization.

## Phase 13 — Reference video style profile

Deliverables:

- Video upload metadata.
- Style profile schema.
- Per-property enable/strength controls.
- Capability warnings.

## Phase 14 — Google Colab operations

Deliverables:

- Colab setup notebook/script.
- Environment checks.
- Sync contract for project/assets/output/logs.
- Resume documentation.

## Phase 15 — Testing, benchmark and release preparation

Deliverables:

- Integration test suite.
- Basic render benchmark.
- Example projects.
- Contributing guide, issue/PR templates.

## Deferred phases

- Additional render engines.
- Distributed workers.
- Multi-user/cloud deployment.
- Plugin marketplace.
- Advanced AI video generation providers.
