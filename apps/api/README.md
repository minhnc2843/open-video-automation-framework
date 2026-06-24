# API App

Fastify API boundary for Phase 09.

Current routes:

- `GET /health`
- `POST /workspaces`
- `POST /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/versions`
- `POST /validation/script`
- `POST /jobs`
- `GET /jobs/:jobId`
- `GET /jobs/:jobId/logs`

Controllers validate request boundaries and dispatch repository or validation services. Long-running render work must run through persisted jobs and workers, not inside request handlers.
