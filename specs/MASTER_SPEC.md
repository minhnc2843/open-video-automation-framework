# Master Specification

## 1. Purpose

Tài liệu này là đặc tả cấp cao và là điểm liên kết đến các standard, architecture document, contract, schema và ADR của dự án. Nó không lặp lại toàn bộ chi tiết kỹ thuật; chi tiết phải sống ở source of truth tương ứng.

## 2. Product statement

Open Video Automation Framework là nền tảng mã nguồn mở để tạo video dọc ngắn từ JSON Script và các asset/AI provider tùy chọn, theo pipeline có thể kiểm tra, retry, cache và debug.

## 3. Scope

### In scope

- Quản lý workspace/project/version/job.
- Import và validate JSON Script.
- Timeline generation.
- Asset management, hashing và cache.
- Provider plugin cho AI/TTS/media.
- Video reference analysis có control theo thuộc tính và strength.
- HTML/Chromium/FFmpeg renderer.
- Preview, dry run, logs, error codes, retry/recovery.
- Local Windows workflow và Google Colab render workflow.

### Out of scope for V1

- Free-form prompt-to-script automation trong Code Mode.
- Real-time NLE editor.
- Cloud render farm multi-region.
- Full collaboration/multi-tenant permission system.
- Native mobile applications.

## 4. Fixed constraints

| Constraint | Rule |
|---|---|
| Aspect ratio | Only `9:16` |
| Resolution | `1080x1920` |
| Duration | Strictly less than 60 seconds |
| Runtime | Node.js 22+ |
| Development OS | Windows-first |
| Containerization | No Docker, no WSL2 dependency |
| Heavy render | Google Colab compatible |
| Render default | HTML + Chromium + FFmpeg |
| Main input | Versioned JSON Script |
| Database V1 | SQLite |
| API style V1 | TypeScript backend with Fastify |

## 5. Architectural laws

1. Core must not depend on a concrete provider plugin.
2. Provider plugins must not depend on UI.
3. Renderer must not know where an asset came from.
4. UI must not contain domain/business logic.
5. JSON schema is the canonical definition of Script input.
6. Timeline is the canonical renderer input.
7. Validation must succeed before render job starts.
8. No silent errors; every failure must be observable.
9. Cache must be invalidated from deterministic input fingerprints.
10. Public contract changes require ADR/proposal and compatibility review.

## 6. Source of truth map

| Domain | Source of truth |
|---|---|
| Long-term decisions | `specs/PROJECT_MEMORY.md`, `adr/` |
| System rules | `specs/AI_RULES.md` |
| Architecture | `architecture/SYSTEM_ARCHITECTURE.md` |
| Script schema | `schemas/` |
| Public interfaces | `contracts/`, `packages/contracts/` |
| Error taxonomy | `specs/ERROR_CODES.md` |
| Event definitions | `specs/EVENT_STANDARD.md` |
| Phase delivery | `docs/ROADMAP.md`, `ai-prompts/` |

## 7. Domain model

```text
Workspace
└── Project
    ├── Project Version
    │   ├── Script Snapshot
    │   ├── Settings Snapshot
    │   ├── Style Profile Snapshot
    │   └── Render Jobs
    ├── Assets
    ├── Logs
    └── Outputs
```

Core entities:

- **Workspace**: logical organization boundary.
- **Project**: user-facing video work item.
- **Project Version**: immutable snapshot used by a render job.
- **Script**: structured scene/layer input.
- **Timeline**: normalized render plan.
- **Asset**: file/remote/generated media with hash and metadata.
- **Job**: stateful execution of validate/generate/render/export.
- **Provider**: external capability plugin.
- **Output**: final MP4 plus render report.

## 8. Processing pipeline

```text
Create/Update Project
→ Create immutable Version Snapshot
→ Validate Script and Settings
→ Build Timeline
→ Resolve Cached Assets
→ Generate Missing Assets through Providers (optional)
→ Generate Voice/Subtitles/Music (optional)
→ Render Changed Scenes
→ Encode/Merge through FFmpeg
→ Validate Output MP4
→ Persist Output, Logs and Metrics
```

Each transition must emit a structured event and log record.

## 9. Code Mode specification

Code Mode accepts a JSON Script, not a free-form prompt. The platform may provide helpers to assist editing, but renderer execution must depend only on valid structured data.

Minimum script controls:

- project name/language.
- scene durations.
- scene layers.
- voice enabled/text.
- music enabled/source.
- subtitle enabled/source.
- animation and transition metadata.

Validation failure blocks rendering.

## 10. API Mode specification

API Mode enriches the project with provider capabilities. It must not bypass the pipeline.

Required provider capabilities:

- credentials validation.
- health check.
- normalized generation request.
- normalized response.
- error normalization.
- cancellation where provider supports it.

API keys must be encrypted at rest and never returned after persistence.

## 11. Reference video specification

Reference analysis produces a `Style Profile`, not direct renderer instructions without review. A style profile may contain:

- camera movement.
- motion intensity.
- composition.
- scene pacing.
- transition density/type.
- text/subtitle placement.
- palette/lighting.
- audio rhythm.

Every category has `enabled` and `strength` values. The UI must explain that a high strength means high preference, not a guarantee of exact reproduction.

## 12. Renderer specification

Default renderer pipeline:

```text
Timeline → scene HTML/CSS/JS → Playwright Chromium capture → image/frame sequence → FFmpeg MP4
```

The renderer must support scene-level caching, preview generation, deterministic input hashing, render reports and output validation.

See: `architecture/SYSTEM_ARCHITECTURE.md` and future `architecture/RENDERER.md`.

## 13. Observability specification

Every stage records:

- timestamp.
- job/project/version id.
- stage name.
- scene id when relevant.
- status.
- duration.
- retry attempt.
- error code.
- technical details sanitized of secrets.

Human-readable logs are derived from structured logs, not the reverse.

## 14. Recovery and cache specification

A failed or interrupted job is recoverable when its immutable version snapshot and required cache/assets still exist. The system resumes from the last successful stage only after validating cache integrity.

## 15. Security specification

- Secrets only from environment variables or encrypted storage.
- No secrets in script, logs, commits or client responses.
- `.env.example` documents names but contains no real values.
- Errors must redact provider credentials and authorization headers.

## 16. Change control

Changes to public contracts, schemas, pipeline stages, database schema, renderer boundary or provider boundary require:

1. ADR/proposal.
2. Compatibility impact description.
3. Migration plan if needed.
4. Test plan.
5. Documentation update.

## 17. Definition of Done for a module

A module is done only when it has:

- explicit purpose and scope;
- input validation;
- public contract/types;
- structured logs and error codes;
- relevant unit/integration tests;
- Windows execution instructions;
- documented limits and non-goals;
- no unapproved public contract changes.
