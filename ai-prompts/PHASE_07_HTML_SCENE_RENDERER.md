# Phase 07 Prompt — HTML Scene Renderer

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
8. Timeline and renderer contracts in `packages/contracts`

## Objective

Create the HTML scene renderer foundation: scene document generation, preview documents, Playwright Chromium capture boundary and scene cache integration.

## In scope

- Timeline scene to standalone HTML document.
- Per-scene HTML preview file generation.
- Playwright Chromium screenshot capture adapter.
- Scene render cache integration using deterministic fingerprints.
- Unit tests with mocked browser/capture where needed.

## Out of scope

- FFmpeg encoding.
- Frame sequence generation.
- Audio mixing.
- Real browser binary installation.
- Provider calls.
- UI preview screen.

## Tests required

- HTML document contains fixed 1080x1920 scene surface.
- Text content is escaped.
- Layer z-index order is preserved.
- Preview HTML file is written.
- Capture adapter calls injected Chromium-like browser API.
- Scene cache reuses valid output and regenerates invalid output.

## Windows commands to verify

Run from repository root:

```powershell
npm install
npm run check
```

## Definition of Done

- Scene document generator works.
- Preview HTML generation works.
- Playwright capture boundary is implemented and tested with injection.
- Scene cache integration is tested.
