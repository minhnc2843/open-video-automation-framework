# Web App

React + Vite frontend for operating the Open Video Automation Framework API.

This workspace must stay presentation-focused. Business rules, validation, provider fallback and render orchestration belong outside React components.

## Phase 10 baseline

The baseline UI provides:

- API base URL selection.
- Workspace/project creation and project open-by-ID.
- JSON Script editing with a starter script.
- Validation results from `POST /validation/script`.
- Project version save through `POST /projects/:projectId/versions`.
- Render job metadata creation through `POST /jobs`.
- Job status refresh and job log loading when a log path exists.

Project listing is intentionally session-local in Phase 10 because the Phase 09 API does not expose a list-projects endpoint yet.

## Development

```powershell
npm install
npm run dev --workspace @ovaf/web
```

By default, the app points to `http://localhost:3000`. Override it with `VITE_API_BASE_URL` or edit the API base URL field in the UI.

```powershell
$env:VITE_API_BASE_URL="http://localhost:3000"
npm run dev --workspace @ovaf/web
```
