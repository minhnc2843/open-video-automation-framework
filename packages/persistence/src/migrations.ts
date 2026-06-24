import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  readonly id: string;
  readonly sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    id: "0001_initial_project_persistence",
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        language TEXT NOT NULL CHECK (language IN ('vi', 'en')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

      CREATE TABLE IF NOT EXISTS project_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        version_number INTEGER NOT NULL CHECK (version_number > 0),
        script_snapshot_json TEXT NOT NULL,
        settings_snapshot_json TEXT NOT NULL,
        style_profile_snapshot_json TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (project_id, version_number),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);

      CREATE TRIGGER IF NOT EXISTS trg_project_versions_no_update
      BEFORE UPDATE ON project_versions
      BEGIN
        SELECT RAISE(ABORT, 'project_versions are immutable');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_project_versions_no_delete
      BEFORE DELETE ON project_versions
      BEGIN
        SELECT RAISE(ABORT, 'project_versions are immutable');
      END;

      CREATE TABLE IF NOT EXISTS render_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_version_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN (
            'queued',
            'validating',
            'preparing',
            'generating_assets',
            'rendering',
            'encoding',
            'validating_output',
            'completed',
            'failed',
            'cancelled',
            'paused',
            'recoverable'
          )
        ),
        config_snapshot_json TEXT NOT NULL,
        provider_snapshot_json TEXT,
        render_environment_json TEXT,
        log_path TEXT,
        output_path TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
        FOREIGN KEY (project_version_id) REFERENCES project_versions(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_project_version_id ON render_jobs(project_version_id);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
    `
  }
];

export function runMigrations(database: DatabaseSync, now: Date = new Date()): readonly string[] {
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database.prepare("SELECT id FROM schema_migrations").all() as unknown as readonly { id: string }[];
  const appliedIds = new Set(appliedRows.map((row) => row.id));
  const appliedNow: string[] = [];

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) {
      continue;
    }

    database.exec("BEGIN;");
    try {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration.id, now.toISOString());
      database.exec("COMMIT;");
      appliedNow.push(migration.id);
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  return appliedNow;
}
