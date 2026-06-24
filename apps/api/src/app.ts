import { readFile } from "node:fs/promises";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  GetJobLogsResponseData,
  ValidateScriptResponseData
} from "@ovaf/contracts";
import { validateJsonScript } from "@ovaf/validator";
import { fail, ok } from "./api-response.js";
import type { ApiProjectRepository } from "./repositories.js";
import {
  getRouteParam,
  isCreateProjectRequest,
  isCreateProjectVersionRequest,
  isCreateRenderJobRequest,
  isCreateWorkspaceRequest,
  isValidateScriptRequest
} from "./request-guards.js";

export interface BuildApiAppOptions {
  readonly repository: ApiProjectRepository;
  readonly readTextFile?: (filePath: string) => Promise<string>;
}

export function buildApiApp(options: BuildApiAppOptions): FastifyInstance {
  const app = Fastify({
    logger: false
  });
  const readLogFile = options.readTextFile ?? ((filePath: string) => readFile(filePath, "utf8"));

  app.get("/health", async () => ok({ status: "ok" }));

  app.post("/workspaces", async (request, reply) => {
    if (!isCreateWorkspaceRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid workspace request body."));
    }

    return reply.code(201).send(ok(options.repository.createWorkspace(request.body)));
  });

  app.post("/projects", async (request, reply) => {
    if (!isCreateProjectRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid project request body."));
    }

    return reply.code(201).send(ok(options.repository.createProject(request.body)));
  });

  app.get("/projects/:projectId", async (request, reply) => {
    const projectId = getRouteParam(request.params, "projectId");
    if (projectId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid project id route parameter."));
    }

    const project = options.repository.getProject(projectId);
    if (project === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Project was not found."));
    }

    return ok(project);
  });

  app.post("/projects/:projectId/versions", async (request, reply) => {
    const projectId = getRouteParam(request.params, "projectId");
    if (projectId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid project id route parameter."));
    }

    if (!isCreateProjectVersionRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid project version request body."));
    }

    return reply.code(201).send(
      ok(
        options.repository.createProjectVersion({
          ...request.body,
          projectId
        })
      )
    );
  });

  app.post("/validation/script", async (request, reply) => {
    if (!isValidateScriptRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid script validation request body."));
    }

    const result = validateJsonScript(
      request.body.script,
      request.body.existingAssetPaths === undefined ? {} : { existingAssetPaths: request.body.existingAssetPaths }
    );
    const data: ValidateScriptResponseData = result.ok
      ? {
          valid: true,
          issues: []
        }
      : {
          valid: false,
          issues: result.issues
        };

    return reply.code(result.ok ? 200 : 422).send(ok(data));
  });

  app.post("/jobs", async (request, reply) => {
    if (!isCreateRenderJobRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid render job request body."));
    }

    return reply.code(201).send(ok(options.repository.createRenderJob(request.body)));
  });

  app.get("/jobs/:jobId", async (request, reply) => {
    const jobId = getRouteParam(request.params, "jobId");
    if (jobId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid job id route parameter."));
    }

    const job = options.repository.getRenderJob(jobId);
    if (job === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Render job was not found."));
    }

    return ok(job);
  });

  app.get("/jobs/:jobId/logs", async (request, reply) => {
    const jobId = getRouteParam(request.params, "jobId");
    if (jobId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid job id route parameter."));
    }

    const job = options.repository.getRenderJob(jobId);
    if (job === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Render job was not found."));
    }

    if (job.logPath === null) {
      return reply.code(404).send(fail("API-LOG-001", "Render job has no log path."));
    }

    try {
      const rawLogs = await readLogFile(job.logPath);
      const data: GetJobLogsResponseData = {
        jobId,
        lines: rawLogs.split(/\r?\n/u).filter((line) => line.length > 0)
      };

      return ok(data);
    } catch (error) {
      return reply
        .code(404)
        .send(fail("API-LOG-001", "Render job logs could not be read.", error instanceof Error ? error.message : String(error)));
    }
  });

  return app;
}
