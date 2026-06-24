import type { FrameworkErrorCode } from "./errors.js";
import type {
  CreateProjectInput,
  CreateProjectVersionInput,
  CreateRenderJobInput,
  CreateWorkspaceInput,
  ProjectRecord,
  ProjectVersionRecord,
  RenderJobRecord,
  WorkspaceRecord
} from "./persistence.js";

export interface ApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: FrameworkErrorCode;
    readonly humanReadableMessage: string;
    readonly technicalDetails?: string;
  };
}

export interface ApiSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export type CreateWorkspaceRequest = CreateWorkspaceInput;
export type CreateWorkspaceResponse = ApiResponse<WorkspaceRecord>;

export type CreateProjectRequest = CreateProjectInput;
export type CreateProjectResponse = ApiResponse<ProjectRecord>;
export type GetProjectResponse = ApiResponse<ProjectRecord>;

export type CreateProjectVersionRequest = Omit<CreateProjectVersionInput, "id" | "projectId"> & {
  readonly id: string;
};
export type CreateProjectVersionResponse = ApiResponse<ProjectVersionRecord>;

export interface ValidateScriptRequest {
  readonly script: unknown;
  readonly existingAssetPaths?: readonly string[];
}

export interface ValidateScriptResponseData {
  readonly valid: boolean;
  readonly issues: readonly {
    readonly code: FrameworkErrorCode;
    readonly path: string;
    readonly humanReadableMessage: string;
    readonly technicalDetails: string;
    readonly sceneId?: string;
  }[];
}

export type ValidateScriptResponse = ApiResponse<ValidateScriptResponseData>;

export type CreateRenderJobRequest = CreateRenderJobInput;
export type CreateRenderJobResponse = ApiResponse<RenderJobRecord>;
export type GetRenderJobResponse = ApiResponse<RenderJobRecord>;

export interface GetJobLogsResponseData {
  readonly jobId: string;
  readonly lines: readonly string[];
}

export type GetJobLogsResponse = ApiResponse<GetJobLogsResponseData>;
