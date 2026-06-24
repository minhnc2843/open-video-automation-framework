import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteProjectRepository } from "@ovaf/persistence";
import { buildApiApp } from "./app.js";

let tempRoot: string;
let repository: SqliteProjectRepository;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-api-"));
  repository = SqliteProjectRepository.open({
    databasePath: path.join(tempRoot, "api.sqlite")
  });
});

afterEach(() => {
  repository.close();
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("API app", () => {
  it("responds to health checks", async () => {
    const app = buildApiApp({ repository });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        status: "ok"
      }
    });
  });

  it("creates and reads workspace/project/version metadata", async () => {
    const app = buildApiApp({ repository });

    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/workspaces",
      payload: {
        id: "workspace-1",
        name: "Default Workspace"
      }
    });
    const projectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        id: "project-1",
        workspaceId: "workspace-1",
        name: "Example video",
        language: "vi"
      }
    });
    const versionResponse = await app.inject({
      method: "POST",
      url: "/projects/project-1/versions",
      payload: {
        id: "version-1",
        scriptSnapshot: { version: "1.0" },
        settingsSnapshot: { width: 1080, height: 1920 }
      }
    });
    const getProjectResponse = await app.inject({
      method: "GET",
      url: "/projects/project-1"
    });

    expect(workspaceResponse.statusCode).toBe(201);
    expect(projectResponse.statusCode).toBe(201);
    expect(versionResponse.statusCode).toBe(201);
    expect(getProjectResponse.statusCode).toBe(200);
    expect(getProjectResponse.json()).toMatchObject({
      ok: true,
      data: {
        id: "project-1",
        workspaceId: "workspace-1"
      }
    });
  });

  it("validates JSON Scripts and returns validation issues", async () => {
    const app = buildApiApp({ repository });

    const response = await app.inject({
      method: "POST",
      url: "/validation/script",
      payload: {
        script: {
          version: "1.0",
          project: {
            name: "Example video",
            language: "vi"
          },
          settings: {
            aspectRatio: "16:9",
            width: 1080,
            height: 1920,
            fps: 30,
            maxDurationSeconds: 5,
            voiceEnabled: false,
            musicEnabled: false,
            subtitleEnabled: false
          },
          scenes: [
            {
              id: "scene-001",
              durationSeconds: 5,
              layers: [
                {
                  id: "text-001",
                  type: "text",
                  content: "Hello"
                }
              ]
            }
          ]
        }
      }
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      ok: true,
      data: {
        valid: false,
        issues: [
          {
            code: "SCRIPT-SCHEMA-001",
            path: "/settings/aspectRatio"
          }
        ]
      }
    });
  });

  it("creates and reads render jobs", async () => {
    const app = buildApiApp({ repository });
    seedProjectVersion();

    const createJobResponse = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        id: "job-1",
        projectId: "project-1",
        projectVersionId: "version-1",
        configSnapshot: { mode: "test" },
        logPath: path.join(tempRoot, "job-1.jsonl")
      }
    });
    const getJobResponse = await app.inject({
      method: "GET",
      url: "/jobs/job-1"
    });

    expect(createJobResponse.statusCode).toBe(201);
    expect(getJobResponse.statusCode).toBe(200);
    expect(getJobResponse.json()).toMatchObject({
      ok: true,
      data: {
        id: "job-1",
        status: "queued",
        retryCount: 0
      }
    });
  });

  it("reads job log lines", async () => {
    const app = buildApiApp({ repository });
    seedProjectVersion();
    const logPath = path.join(tempRoot, "job-1.jsonl");
    writeFileSync(logPath, "{\"message\":\"one\"}\n{\"message\":\"two\"}\n", "utf8");
    repository.createRenderJob({
      id: "job-1",
      projectId: "project-1",
      projectVersionId: "version-1",
      configSnapshot: {},
      logPath
    });

    const response = await app.inject({
      method: "GET",
      url: "/jobs/job-1/logs"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        jobId: "job-1",
        lines: ["{\"message\":\"one\"}", "{\"message\":\"two\"}"]
      }
    });
  });

  it("returns API errors for missing resources and invalid bodies", async () => {
    const app = buildApiApp({ repository });

    const missing = await app.inject({
      method: "GET",
      url: "/projects/missing"
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        id: "project-1"
      }
    });

    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({
      ok: false,
      error: {
        code: "API-NOTFOUND-001"
      }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      ok: false,
      error: {
        code: "API-REQUEST-001"
      }
    });
  });
});

function seedProjectVersion(): void {
  repository.createWorkspace({
    id: "workspace-1",
    name: "Default Workspace"
  });
  repository.createProject({
    id: "project-1",
    workspaceId: "workspace-1",
    name: "Example video",
    language: "en"
  });
  repository.createProjectVersion({
    id: "version-1",
    projectId: "project-1",
    scriptSnapshot: { version: "1.0" },
    settingsSnapshot: { width: 1080, height: 1920 }
  });
}
