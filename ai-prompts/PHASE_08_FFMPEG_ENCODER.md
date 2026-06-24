# Phase 08 Prompt — FFmpeg Encoder and Output Validation

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
8. `adr/ADR-005-FFMPEG-ENCODER-ADAPTER-PACKAGE.md`

## Objective

Create the FFmpeg encoder adapter and MP4 output validation foundation.

## In scope

- FFmpeg command builder for image sequences and video files.
- Scene video concat manifest and concat command builder.
- Audio switches for no audio, single audio and multi-track audio mix.
- Process runner boundary.
- FFprobe JSON metadata validation for 1080x1920, duration under 60 seconds and MP4-like format.
- Unit tests using fake runners.

## Out of scope

- Installing FFmpeg.
- Real render benchmark.
- Audio generation.
- Renderer frame sequence integration.
- API/UI endpoints.

## Tests required

- Image sequence command includes fps, scale/pad, x264 and no-audio switches.
- Single and multi-track audio switches are generated.
- Scene concat manifest escapes paths.
- FFprobe valid metadata passes.
- Invalid width/height/duration/format fails with `OUTPUT-VALIDATION-001`.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Encoder command construction is deterministic.
- Output validation is tested.
- Tests do not require FFmpeg installed.
