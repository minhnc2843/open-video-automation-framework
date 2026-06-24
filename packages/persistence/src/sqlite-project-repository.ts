import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  CreateProjectInput,
  CreateProjectVersionInput,
  CreateRenderJobInput,
  CreateWorkspaceInput,
  JobStatus,
  JsonObject,
  ProjectRecord,
  ProjectVersionRecord,
  RenderJobRecord,
  WorkspaceRecord
} from "@ovaf/contracts";
import { runMigrations } from "./migrations.js";

interface WorkspaceRow {
  readonly id: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface ProjectRow {
  readonly id: string;
  readonly workspace_id: string;
  readonly name: string;
  readonly language: "vi" | "en";
  readonly created_at: string;
  readonly updated_at: string;
}

interface ProjectVersionRow {
  readonly id: string;
  readonly project_id: string;
  readonly version_number: number;
  readonly script_snapshot_json: string;
  readonly settings_snapshot_json: string;
  readonly style_profile_snapshot_json: string | null;
  readonly created_at: string;
}

interface RenderJobRow {
  readonly id: string;
  readonly project_id: string;
  readonly project_version_id: string;
  readonly status: RenderJobRecord["status"];
  readonly config_snapshot_json: string;
  readonly provider_snapshot_json: string | null;
  readonly render_environment_json: string | null;
  readonly log_path: string | null;
  readonly output_path: string | null;
  readonly retry_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly started_at: string | null;
  readonly finished_at: string | null;
}

export interface OpenProjectRepositoryOptions {
  readonly databasePath: string;
  readonly migrate?: boolean;
}

export class SqliteProjectRepository {
  readonly database: DatabaseSync;

  private constructor(database: DatabaseSync) {
    this.database = database;
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  static open(options: OpenProjectRepositoryOptions): SqliteProjectRepository {
    if (options.databasePath !== ":memory:") {
      mkdirSync(path.dirname(options.databasePath), { recursive: true });
    }

    const database = new DatabaseSync(options.databasePath);
    const repository = new SqliteProjectRepository(database);

    if (options.migrate ?? true) {
      repository.migrate();
    }

    return repository;
  }

  migrate(): readonly string[] {
    return runMigrations(this.database);
  }

  close(): void {
    this.database.close();
  }

  createWorkspace(input: CreateWorkspaceInput, now: Date = new Date()): WorkspaceRecord {
    const timestamp = now.toISOString();
    this.database
      .prepare("INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(input.id, input.name, timestamp, timestamp);

    return this.getWorkspace(input.id) ?? fail(`Workspace was not created: ${input.id}`);
  }

  getWorkspace(id: string): WorkspaceRecord | null {
    const row = this.database.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as WorkspaceRow | undefined;
    return row === undefined ? null : mapWorkspace(row);
  }

  createProject(input: CreateProjectInput, now: Date = new Date()): ProjectRecord {
    const timestamp = now.toISOString();
    this.database
      .prepare(
        "INSERT INTO projects (id, workspace_id, name, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(input.id, input.workspaceId, input.name, input.language, timestamp, timestamp);

    return this.getProject(input.id) ?? fail(`Project was not created: ${input.id}`);
  }

  getProject(id: string): ProjectRecord | null {
    const row = this.database.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
    return row === undefined ? null : mapProject(row);
  }

  createProjectVersion(input: CreateProjectVersionInput, now: Date = new Date()): ProjectVersionRecord {
    const timestamp = now.toISOString();
    const nextVersionNumber = this.getNextProjectVersionNumber(input.projectId);

    this.database
      .prepare(
        `INSERT INTO project_versions (
          id,
          project_id,
          version_number,
          script_snapshot_json,
          settings_snapshot_json,
          style_profile_snapshot_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.projectId,
        nextVersionNumber,
        stringifyJson(input.scriptSnapshot),
        stringifyJson(input.settingsSnapshot),
        input.styleProfileSnapshot === undefined || input.styleProfileSnapshot === null
          ? null
          : stringifyJson(input.styleProfileSnapshot),
        timestamp
      );

    return this.getProjectVersion(input.id) ?? fail(`Project version was not created: ${input.id}`);
  }

  getProjectVersion(id: string): ProjectVersionRecord | null {
    const row = this.database
      .prepare("SELECT * FROM project_versions WHERE id = ?")
      .get(id) as ProjectVersionRow | undefined;
    return row === undefined ? null : mapProjectVersion(row);
  }

  createRenderJob(input: CreateRenderJobInput, now: Date = new Date()): RenderJobRecord {
    const timestamp = now.toISOString();
    this.database
      .prepare(
        `INSERT INTO render_jobs (
          id,
          project_id,
          project_version_id,
          status,
          config_snapshot_json,
          provider_snapshot_json,
          render_environment_json,
          log_path,
          output_path,
          retry_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(
        input.id,
        input.projectId,
        input.projectVersionId,
        stringifyJson(input.configSnapshot),
        input.providerSnapshot === undefined || input.providerSnapshot === null ? null : stringifyJson(input.providerSnapshot),
        input.renderEnvironment === undefined || input.renderEnvironment === null
          ? null
          : stringifyJson(input.renderEnvironment),
        input.logPath ?? null,
        input.outputPath ?? null,
        timestamp,
        timestamp
      );

    return this.getRenderJob(input.id) ?? fail(`Render job was not created: ${input.id}`);
  }

  getRenderJob(id: string): RenderJobRecord | null {
    const row = this.database.prepare("SELECT * FROM render_jobs WHERE id = ?").get(id) as RenderJobRow | undefined;
    return row === undefined ? null : mapRenderJob(row);
  }

  updateRenderJobStatus(
    id: string,
    status: JobStatus,
    now: Date = new Date(),
    options: {
      readonly incrementRetryCount?: boolean;
      readonly startedAt?: string | null;
      readonly finishedAt?: string | null;
    } = {}
  ): RenderJobRecord {
    const current = this.getRenderJob(id);
    if (current === null) {
      throw new Error(`JOB-STATE-002: render job was not found: ${id}`);
    }

    const updatedAt = now.toISOString();
    const startedAt = options.startedAt === undefined ? current.startedAt : options.startedAt;
    const finishedAt = options.finishedAt === undefined ? current.finishedAt : options.finishedAt;
    const retryCount = current.retryCount + (options.incrementRetryCount === true ? 1 : 0);

    this.database
      .prepare(
        `UPDATE render_jobs
          SET status = ?,
              retry_count = ?,
              updated_at = ?,
              started_at = ?,
              finished_at = ?
          WHERE id = ?`
      )
      .run(status, retryCount, updatedAt, startedAt, finishedAt, id);

    return this.getRenderJob(id) ?? fail(`Render job was not updated: ${id}`);
  }

  private getNextProjectVersionNumber(projectId: string): number {
    const row = this.database
      .prepare("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version_number FROM project_versions WHERE project_id = ?")
      .get(projectId) as { readonly next_version_number: number } | undefined;

    return row?.next_version_number ?? 1;
  }
}

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    language: row.language,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProjectVersion(row: ProjectVersionRow): ProjectVersionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    scriptSnapshot: parseJsonObject(row.script_snapshot_json),
    settingsSnapshot: parseJsonObject(row.settings_snapshot_json),
    styleProfileSnapshot:
      row.style_profile_snapshot_json === null ? null : parseJsonObject(row.style_profile_snapshot_json),
    createdAt: row.created_at
  };
}

function mapRenderJob(row: RenderJobRow): RenderJobRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectVersionId: row.project_version_id,
    status: row.status,
    configSnapshot: parseJsonObject(row.config_snapshot_json),
    providerSnapshot: row.provider_snapshot_json === null ? null : parseJsonObject(row.provider_snapshot_json),
    renderEnvironment: row.render_environment_json === null ? null : parseJsonObject(row.render_environment_json),
    logPath: row.log_path,
    outputPath: row.output_path,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

function stringifyJson(value: JsonObject): string {
  return JSON.stringify(value);
}

function parseJsonObject(value: string): JsonObject {
  return JSON.parse(value) as JsonObject;
}

function fail(message: string): never {
  throw new Error(message);
}
