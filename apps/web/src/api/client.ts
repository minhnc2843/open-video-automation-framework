import type {
  ApiResponse,
  CancelRenderJobResponse,
  CreateRenderJobFromScriptRequest,
  CreateRenderJobFromScriptResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateProjectVersionRequest,
  CreateProjectVersionResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  GetJobLogsResponse,
  GetProjectResponse,
  RenderJobStatusResponse,
  ValidateScriptRequest,
  ValidateScriptResponse
} from "@ovaf/contracts";

export interface HealthResponseData {
  readonly status: "ok";
}

export type HealthResponse = ApiResponse<HealthResponseData>;

export type ApiFetch = (input: string, init?: RequestInit) => Promise<Pick<Response, "json">>;

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetcher?: ApiFetch;
}

export interface ApiClient {
  readonly health: () => Promise<HealthResponse>;
  readonly createWorkspace: (request: CreateWorkspaceRequest) => Promise<CreateWorkspaceResponse>;
  readonly createProject: (request: CreateProjectRequest) => Promise<CreateProjectResponse>;
  readonly getProject: (projectId: string) => Promise<GetProjectResponse>;
  readonly createProjectVersion: (
    projectId: string,
    request: CreateProjectVersionRequest
  ) => Promise<CreateProjectVersionResponse>;
  readonly validateScript: (request: ValidateScriptRequest) => Promise<ValidateScriptResponse>;
  readonly createRenderJob: (
    projectId: string,
    request: CreateRenderJobFromScriptRequest
  ) => Promise<CreateRenderJobFromScriptResponse>;
  readonly getRenderJobStatus: (jobId: string) => Promise<RenderJobStatusResponse>;
  readonly getJobLogs: (jobId: string) => Promise<GetJobLogsResponse>;
  readonly cancelRenderJob: (jobId: string) => Promise<CancelRenderJobResponse>;
  readonly getRenderJobOutputUrl: (jobId: string) => string;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? defaultFetch;

  async function request<TData>(
    method: "GET" | "POST",
    route: string,
    body?: unknown
  ): Promise<ApiResponse<TData>> {
    const headers = new Headers();
    headers.set("accept", "application/json");

    const init: RequestInit = {
      headers,
      method
    };

    if (body !== undefined) {
      headers.set("content-type", "application/json");
      init.body = JSON.stringify(body);
    }

    const response = await fetcher(toUrl(baseUrl, route), init);
    return (await response.json()) as ApiResponse<TData>;
  }

  return {
    cancelRenderJob: (jobId) => request("POST", `/api/render-jobs/${encodeURIComponent(jobId)}/cancel`),
    createProject: (projectRequest) => request("POST", "/projects", projectRequest),
    createProjectVersion: (projectId, versionRequest) =>
      request("POST", `/projects/${encodeURIComponent(projectId)}/versions`, versionRequest),
    createRenderJob: (projectId, jobRequest) =>
      request("POST", `/api/projects/${encodeURIComponent(projectId)}/render-jobs`, jobRequest),
    createWorkspace: (workspaceRequest) => request("POST", "/workspaces", workspaceRequest),
    getJobLogs: (jobId) => request("GET", `/api/render-jobs/${encodeURIComponent(jobId)}/logs`),
    getProject: (projectId) => request("GET", `/projects/${encodeURIComponent(projectId)}`),
    getRenderJobOutputUrl: (jobId) => toUrl(baseUrl, `/api/render-jobs/${encodeURIComponent(jobId)}/output`),
    getRenderJobStatus: (jobId) => request("GET", `/api/render-jobs/${encodeURIComponent(jobId)}`),
    health: () => request("GET", "/health"),
    validateScript: (validationRequest) => request("POST", "/validation/script", validationRequest)
  };
}

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (trimmed === "/" || trimmed.length === 0) {
    return "";
  }

  return trimmed.replace(/\/+$/u, "");
}

function toUrl(baseUrl: string, route: string): string {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return `${baseUrl}${normalizedRoute}`;
}

const defaultFetch: ApiFetch = async (input, init) => globalThis.fetch(input, init);
