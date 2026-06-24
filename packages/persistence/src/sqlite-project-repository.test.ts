import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteProjectRepository } from "./sqlite-project-repository.js";

let tempRoot: string;
let repository: SqliteProjectRepository;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-persistence-"));
  repository = SqliteProjectRepository.open({
    databasePath: path.join(tempRoot, "project-store.sqlite")
  });
});

afterEach(() => {
  repository.close();
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("SqliteProjectRepository", () => {
  it("runs a fresh migration and records it once", () => {
    const migrations = repository.database.prepare("SELECT id FROM schema_migrations").all();

    expect(migrations).toEqual([{ id: "0001_initial_project_persistence" }]);
    expect(repository.migrate()).toEqual([]);
  });

  it("creates and reads workspace, project, immutable version and render job records", () => {
    const now = new Date("2026-06-24T00:00:00.000Z");

    const workspace = repository.createWorkspace({ id: "workspace-1", name: "Default Workspace" }, now);
    const project = repository.createProject(
      {
        id: "project-1",
        workspaceId: workspace.id,
        name: "Example video",
        language: "vi"
      },
      now
    );
    const version = repository.createProjectVersion(
      {
        id: "version-1",
        projectId: project.id,
        scriptSnapshot: { version: "1.0" },
        settingsSnapshot: { width: 1080, height: 1920 }
      },
      now
    );
    const job = repository.createRenderJob(
      {
        id: "job-1",
        projectId: project.id,
        projectVersionId: version.id,
        configSnapshot: { app: "test" },
        renderEnvironment: { node: "24" },
        logPath: "storage/logs/job-1.jsonl"
      },
      now
    );

    expect(repository.getWorkspace(workspace.id)).toEqual(workspace);
    expect(repository.getProject(project.id)).toEqual(project);
    expect(repository.getProjectVersion(version.id)).toMatchObject({
      id: "version-1",
      versionNumber: 1,
      scriptSnapshot: { version: "1.0" }
    });
    expect(repository.getRenderJob(job.id)).toMatchObject({
      id: "job-1",
      status: "queued",
      retryCount: 0,
      logPath: "storage/logs/job-1.jsonl"
    });
  });

  it("increments project version numbers per project", () => {
    repository.createWorkspace({ id: "workspace-1", name: "Default Workspace" });
    repository.createProject({
      id: "project-1",
      workspaceId: "workspace-1",
      name: "Example video",
      language: "en"
    });

    const first = repository.createProjectVersion({
      id: "version-1",
      projectId: "project-1",
      scriptSnapshot: { version: "1.0" },
      settingsSnapshot: { width: 1080 }
    });
    const second = repository.createProjectVersion({
      id: "version-2",
      projectId: "project-1",
      scriptSnapshot: { version: "1.0" },
      settingsSnapshot: { width: 1080 }
    });

    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
  });

  it("blocks updates to immutable project version snapshots", () => {
    repository.createWorkspace({ id: "workspace-1", name: "Default Workspace" });
    repository.createProject({
      id: "project-1",
      workspaceId: "workspace-1",
      name: "Example video",
      language: "vi"
    });
    repository.createProjectVersion({
      id: "version-1",
      projectId: "project-1",
      scriptSnapshot: { version: "1.0" },
      settingsSnapshot: { width: 1080 }
    });

    expect(() =>
      repository.database
        .prepare("UPDATE project_versions SET script_snapshot_json = ? WHERE id = ?")
        .run(JSON.stringify({ version: "2.0" }), "version-1")
    ).toThrow(/immutable/);
  });

  it("updates render job status, retry count and timestamps", () => {
    repository.createWorkspace({ id: "workspace-1", name: "Default Workspace" });
    repository.createProject({
      id: "project-1",
      workspaceId: "workspace-1",
      name: "Example video",
      language: "vi"
    });
    const version = repository.createProjectVersion({
      id: "version-1",
      projectId: "project-1",
      scriptSnapshot: { version: "1.0" },
      settingsSnapshot: { width: 1080 }
    });
    repository.createRenderJob({
      id: "job-1",
      projectId: "project-1",
      projectVersionId: version.id,
      configSnapshot: {}
    });

    const updated = repository.updateRenderJobStatus("job-1", "recoverable", new Date("2026-06-24T01:00:00.000Z"), {
      incrementRetryCount: true,
      startedAt: "2026-06-24T00:00:00.000Z"
    });

    expect(updated).toMatchObject({
      status: "recoverable",
      retryCount: 1,
      updatedAt: "2026-06-24T01:00:00.000Z",
      startedAt: "2026-06-24T00:00:00.000Z"
    });
  });
});
