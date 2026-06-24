import type { JobStatus, ProjectLanguage } from "./index.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface WorkspaceRecord {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly language: ProjectLanguage;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectVersionRecord {
  readonly id: string;
  readonly projectId: string;
  readonly versionNumber: number;
  readonly scriptSnapshot: JsonObject;
  readonly settingsSnapshot: JsonObject;
  readonly styleProfileSnapshot: JsonObject | null;
  readonly createdAt: string;
}

export interface RenderJobRecord {
  readonly id: string;
  readonly projectId: string;
  readonly projectVersionId: string;
  readonly status: JobStatus;
  readonly configSnapshot: JsonObject;
  readonly providerSnapshot: JsonObject | null;
  readonly renderEnvironment: JsonObject | null;
  readonly logPath: string | null;
  readonly outputPath: string | null;
  readonly retryCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

export interface CreateWorkspaceInput {
  readonly id: string;
  readonly name: string;
}

export interface CreateProjectInput {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly language: ProjectLanguage;
}

export interface CreateProjectVersionInput {
  readonly id: string;
  readonly projectId: string;
  readonly scriptSnapshot: JsonObject;
  readonly settingsSnapshot: JsonObject;
  readonly styleProfileSnapshot?: JsonObject | null;
}

export interface CreateRenderJobInput {
  readonly id: string;
  readonly projectId: string;
  readonly projectVersionId: string;
  readonly configSnapshot: JsonObject;
  readonly providerSnapshot?: JsonObject | null;
  readonly renderEnvironment?: JsonObject | null;
  readonly logPath?: string | null;
  readonly outputPath?: string | null;
}
