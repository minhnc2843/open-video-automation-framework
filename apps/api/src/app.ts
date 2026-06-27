import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  GetJobLogsResponseData,
  RenderJobStatusResponseData,
  ValidateScriptResponseData
} from "@ovaf/contracts";
import { validateJsonScript } from "@ovaf/validator";
import { fail, ok } from "./api-response.js";
import type { ApiProjectRepository } from "./repositories.js";
import { outputExists, parseStructuredLogs, RenderJobService, RenderJobServiceError } from "./render-job-service.js";
import {
  getRouteParam,
  isCreateRenderJobFromScriptRequest,
  isCreateProjectRequest,
  isCreateProjectVersionRequest,
  isCreateRenderJobRequest,
  isCreateWorkspaceRequest,
  isValidateScriptRequest
} from "./request-guards.js";

export interface BuildApiAppOptions {
  readonly repository: ApiProjectRepository;
  readonly readTextFile?: (filePath: string) => Promise<string>;
  readonly renderJobService?: RenderJobService;
  readonly storageRoot?: string;
}

export function buildApiApp(options: BuildApiAppOptions): FastifyInstance {
  const app = Fastify({
    logger: false
  });
  const readLogFile = options.readTextFile ?? ((filePath: string) => readFile(filePath, "utf8"));
  const renderJobService =
    options.renderJobService ??
    new RenderJobService({
      repository: options.repository,
      storageRoot: options.storageRoot ?? path.resolve(process.cwd(), "storage")
    });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-methods", "GET,POST,OPTIONS");
    reply.header("access-control-allow-headers", "content-type,accept");
    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }

    return undefined;
  });

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
        lines: rawLogs.split(/\r?\n/u).filter((line) => line.length > 0),
        logs: parseStructuredLogs(rawLogs)
      };

      return ok(data);
    } catch (error) {
      return reply
        .code(404)
        .send(fail("API-LOG-001", "Render job logs could not be read.", error instanceof Error ? error.message : String(error)));
    }
  });

  app.post("/api/projects/:projectId/render-jobs", async (request, reply) => {
    const projectId = getRouteParam(request.params, "projectId");
    if (projectId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid project id route parameter."));
    }

    if (!isCreateRenderJobFromScriptRequest(request.body)) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid render job request body."));
    }

    const validation = validateJsonScript(request.body.script);
    if (!validation.ok) {
      const firstIssue = validation.issues[0];
      return reply
        .code(422)
        .send(
          fail(
            firstIssue?.code ?? "SCRIPT-SCHEMA-001",
            "JSON Script validation failed.",
            firstIssue?.technicalDetails,
            validation.issues
          )
        );
    }

    try {
      const data = renderJobService.createAndStartRenderJob({
        projectId,
        script: validation.script
      });

      return reply.code(201).send(ok(data));
    } catch (error) {
      if (error instanceof RenderJobServiceError) {
        const statusCode = error.code === "API-NOTFOUND-001" ? 404 : 409;
        return reply.code(statusCode).send(fail(error.code, error.message));
      }

      return reply
        .code(500)
        .send(fail("API-REQUEST-001", "Render job could not be created.", error instanceof Error ? error.message : String(error)));
    }
  });

  app.get("/api/render-jobs/:jobId", async (request, reply) => {
    const jobId = getRouteParam(request.params, "jobId");
    if (jobId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid job id route parameter."));
    }

    const status = renderJobService.getStatus(jobId);
    if (status === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Render job was not found."));
    }

    return ok<RenderJobStatusResponseData>(status);
  });

  app.get("/api/render-jobs/:jobId/logs", async (request, reply) => {
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
      const lines = rawLogs.split(/\r?\n/u).filter((line) => line.length > 0);
      return ok<GetJobLogsResponseData>({
        jobId,
        lines,
        logs: parseStructuredLogs(rawLogs)
      });
    } catch (error) {
      return reply
        .code(404)
        .send(fail("API-LOG-001", "Render job logs could not be read.", error instanceof Error ? error.message : String(error)));
    }
  });

  app.get("/api/render-jobs/:jobId/output", async (request, reply) => {
    const jobId = getRouteParam(request.params, "jobId");
    if (jobId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid job id route parameter."));
    }

    const job = options.repository.getRenderJob(jobId);
    if (job === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Render job was not found."));
    }

    if (job.status !== "completed") {
      return reply.code(409).send(fail("JOB-STATE-001", "Render job output is only available after completion."));
    }

    if (job.outputPath === null || !(await outputExists(job.outputPath))) {
      return reply.code(404).send(fail("OUTPUT-VALIDATION-001", "Render job output file was not found."));
    }

    const outputStats = await stat(job.outputPath);
    if (outputStats.size <= 0) {
      return reply.code(404).send(fail("OUTPUT-VALIDATION-001", "Render job output file is empty."));
    }

    const fileName = path.basename(job.outputPath);
    reply.header("content-type", "video/mp4");
    reply.header("content-length", String(outputStats.size));
    reply.header("content-disposition", `inline; filename="${fileName}"`);
    return reply.send(createReadStream(job.outputPath));
  });

  app.post("/api/render-jobs/:jobId/cancel", async (request, reply) => {
    const jobId = getRouteParam(request.params, "jobId");
    if (jobId === null) {
      return reply.code(400).send(fail("API-REQUEST-001", "Invalid job id route parameter."));
    }

    const result = await renderJobService.cancel(jobId);
    if (result === null) {
      return reply.code(404).send(fail("API-NOTFOUND-001", "Render job was not found."));
    }

    return ok(result);
  });

  return app;
}
