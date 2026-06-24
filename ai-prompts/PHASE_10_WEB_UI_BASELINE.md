# Phase 10 — Web UI Baseline

## Goal

Build the first usable React + Vite interface for operating the Phase 09 API without placing business rules inside React components.

## Scope

- Turn `apps/web` into a real npm workspace with Vite, React and Tailwind CSS.
- Add a typed API client for the Fastify routes from Phase 09.
- Add a state/workflow hook for UI actions:
  - set API base URL,
  - create/open project,
  - edit JSON Script,
  - validate script,
  - save project version,
  - queue render job metadata,
  - refresh job status,
  - load job logs.
- Build a first-screen operational UI:
  - project control panel,
  - JSON Script editor,
  - validation report,
  - render job progress and log viewer.
- Keep project listing session-local until the API exposes a list route.

## Non-goals

- No authentication.
- No asset upload UI.
- No provider configuration UI.
- No timeline visual editor.
- No render worker start/stop controls.
- No backend route expansion unless Phase 10 cannot work without it.

## Architecture Rules

- UI components are presentation-focused.
- API route details live in `src/api/client.ts`.
- Workflow logic lives in `src/state/useVideoAutomationWorkspace.ts`.
- The UI uses shared contracts from `@ovaf/contracts`.
- Validation always happens through the API route, not duplicated in the browser.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build --workspace @ovaf/web` passes.
- `npm run check` passes.
- `apps/web/README.md` documents how to run the UI and configure API base URL.
