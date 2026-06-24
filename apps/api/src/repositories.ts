import type {
  CreateProjectInput,
  CreateProjectVersionInput,
  CreateRenderJobInput,
  CreateWorkspaceInput,
  ProjectRecord,
  ProjectVersionRecord,
  RenderJobRecord,
  WorkspaceRecord
} from "@ovaf/contracts";

export interface ApiProjectRepository {
  readonly createWorkspace: (input: CreateWorkspaceInput, now?: Date) => WorkspaceRecord;
  readonly createProject: (input: CreateProjectInput, now?: Date) => ProjectRecord;
  readonly getProject: (id: string) => ProjectRecord | null;
  readonly createProjectVersion: (input: CreateProjectVersionInput, now?: Date) => ProjectVersionRecord;
  readonly createRenderJob: (input: CreateRenderJobInput, now?: Date) => RenderJobRecord;
  readonly getRenderJob: (id: string) => RenderJobRecord | null;
}
