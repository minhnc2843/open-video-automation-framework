import type { FrameworkErrorCode } from "./errors.js";
import type { JobStatus } from "./events.js";
import type { StructuredLogRecord } from "./logs.js";
import type {
  CreateProjectInput,
  CreateProjectVersionInput,
  CreateRenderJobInput,
  CreateWorkspaceInput,
  JsonObject,
  ProjectRecord,
  ProjectVersionRecord,
  RenderJobRecord,
  WorkspaceRecord
} from "./persistence.js";

export interface ScriptValidationIssue {
  readonly code: FrameworkErrorCode;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly sceneId?: string;
}

export interface ApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: FrameworkErrorCode;
    readonly humanReadableMessage: string;
    readonly technicalDetails?: string;
    readonly validationIssues?: readonly ScriptValidationIssue[];
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
  readonly issues: readonly ScriptValidationIssue[];
}

export type ValidateScriptResponse = ApiResponse<ValidateScriptResponseData>;

export type CreateRenderJobRequest = CreateRenderJobInput;
export type CreateRenderJobResponse = ApiResponse<RenderJobRecord>;
export type GetRenderJobResponse = ApiResponse<RenderJobRecord>;

export interface CreateRenderJobFromScriptRequest {
  readonly script: unknown;
}

export interface CreateRenderJobFromScriptResponseData {
  readonly jobId: string;
  readonly status: "queued";
  readonly projectId: string;
  readonly createdAt: string;
}

export type CreateRenderJobFromScriptResponse = ApiResponse<CreateRenderJobFromScriptResponseData>;

export interface RenderJobProgressData {
  readonly currentStage: string;
  readonly completedScenes: number;
  readonly totalScenes: number;
  readonly percent: number;
  readonly sceneIndex?: number;
  readonly sceneId?: string;
}

export interface RenderJobOutputData {
  readonly videoUrl: string;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationSeconds: number;
}

export interface RenderJobErrorData {
  readonly code: string;
  readonly message: string;
  readonly technicalDetails?: JsonObject;
}

export interface RenderJobStatusResponseData {
  readonly jobId: string;
  readonly projectId: string;
  readonly status: JobStatus;
  readonly progress: RenderJobProgressData;
  readonly error: RenderJobErrorData | null;
  readonly output: RenderJobOutputData | null;
}

export type RenderJobStatusResponse = ApiResponse<RenderJobStatusResponseData>;

export interface GetJobLogsResponseData {
  readonly jobId: string;
  readonly lines: readonly string[];
  readonly logs: readonly StructuredLogRecord[];
}

export type GetJobLogsResponse = ApiResponse<GetJobLogsResponseData>;

export interface CancelRenderJobResponseData {
  readonly jobId: string;
  readonly status: JobStatus;
  readonly warning?: {
    readonly code: string;
    readonly message: string;
  };
}

export type CancelRenderJobResponse = ApiResponse<CancelRenderJobResponseData>;
