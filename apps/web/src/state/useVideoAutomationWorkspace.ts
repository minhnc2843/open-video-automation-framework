import { useCallback, useMemo, useState } from "react";
import type {
  ApiResponse,
  JsonObject,
  ProjectLanguage,
  ProjectRecord,
  ProjectVersionRecord,
  RenderJobRecord,
  ValidateScriptResponseData
} from "@ovaf/contracts";
import { createApiClient } from "../api/client";
import { SAMPLE_JSON_SCRIPT } from "./sample-script";

export type WorkspaceAction =
  | "create-project"
  | "open-project"
  | "validate-script"
  | "save-version"
  | "queue-job"
  | "refresh-job"
  | "load-logs";

export interface ValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly humanReadableMessage: string;
  readonly technicalDetails: string;
  readonly sceneId?: string;
}

export interface ValidationSummary {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface RecentProject {
  readonly record: ProjectRecord;
  readonly lastOpenedAt: string;
}

export interface CreateProjectDraft {
  readonly name: string;
  readonly language: ProjectLanguage;
}

export interface VideoAutomationWorkspaceState {
  readonly apiBaseUrl: string;
  readonly busyAction: WorkspaceAction | null;
  readonly error: string | null;
  readonly job: RenderJobRecord | null;
  readonly latestVersion: ProjectVersionRecord | null;
  readonly logs: readonly string[];
  readonly recentProjects: readonly RecentProject[];
  readonly scriptText: string;
  readonly selectedProject: ProjectRecord | null;
  readonly statusMessage: string;
  readonly validation: ValidationSummary | null;
  readonly workspaceId: string | null;
}

export interface VideoAutomationWorkspaceActions {
  readonly createProject: (draft: CreateProjectDraft) => Promise<ProjectRecord | null>;
  readonly loadLogs: () => Promise<readonly string[] | null>;
  readonly openProject: (projectId: string) => Promise<ProjectRecord | null>;
  readonly queueRenderJob: () => Promise<RenderJobRecord | null>;
  readonly refreshJob: () => Promise<RenderJobRecord | null>;
  readonly saveVersion: () => Promise<ProjectVersionRecord | null>;
  readonly setApiBaseUrl: (baseUrl: string) => void;
  readonly setScriptText: (scriptText: string) => void;
  readonly validateScript: () => Promise<ValidationSummary | null>;
}

export interface UseVideoAutomationWorkspaceResult {
  readonly actions: VideoAutomationWorkspaceActions;
  readonly state: VideoAutomationWorkspaceState;
}

export function useVideoAutomationWorkspace(): UseVideoAutomationWorkspaceResult {
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultApiBaseUrl);
  const [busyAction, setBusyAction] = useState<WorkspaceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<RenderJobRecord | null>(null);
  const [latestVersion, setLatestVersion] = useState<ProjectVersionRecord | null>(null);
  const [logs, setLogs] = useState<readonly string[]>([]);
  const [recentProjects, setRecentProjects] = useState<readonly RecentProject[]>([]);
  const [scriptText, setScriptText] = useState(SAMPLE_JSON_SCRIPT);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Connect an API, create a project, then validate a JSON Script.");
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
  const selectedProject = useMemo(
    () => recentProjects.find((project) => project.record.id === selectedProjectId)?.record ?? null,
    [recentProjects, selectedProjectId]
  );

  const runAction = useCallback(
    async <TResult,>(action: WorkspaceAction, work: () => Promise<TResult>): Promise<TResult | null> => {
      setBusyAction(action);
      setError(null);
      try {
        return await work();
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        setError(message);
        return null;
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  const validateCurrentScript = useCallback(async (): Promise<ValidationSummary> => {
    const parsed = parseScriptText(scriptText);
    if (!parsed.ok) {
      const parseSummary = createParseErrorSummary(parsed.message);
      setValidation(parseSummary);
      setStatusMessage("JSON parsing failed before API validation.");
      return parseSummary;
    }

    const validationData = unwrapResponse(
      await client.validateScript({
        script: parsed.value
      })
    );
    const summary: ValidationSummary = {
      issues: validationData.issues,
      valid: validationData.valid
    };
    setValidation(summary);
    setStatusMessage(summary.valid ? "Script validation passed." : `Script validation found ${summary.issues.length} issue(s).`);
    return summary;
  }, [client, scriptText]);

  const saveValidatedVersion = useCallback(
    async (projectId: string): Promise<ProjectVersionRecord> => {
      const parsed = parseScriptText(scriptText);
      if (!parsed.ok) {
        const parseSummary = createParseErrorSummary(parsed.message);
        setValidation(parseSummary);
        throw new Error("Fix JSON parsing before saving a project version.");
      }

      const validationData = unwrapResponse(
        await client.validateScript({
          script: parsed.value
        })
      );
      const summary: ValidationSummary = {
        issues: validationData.issues,
        valid: validationData.valid
      };
      setValidation(summary);
      if (!summary.valid) {
        throw new Error("Fix validation issues before saving a project version.");
      }

      const version = unwrapResponse(
        await client.createProjectVersion(projectId, {
          id: createId("version"),
          scriptSnapshot: parsed.value,
          settingsSnapshot: readSettingsSnapshot(parsed.value),
          styleProfileSnapshot: null
        })
      );
      setLatestVersion(version);
      setStatusMessage(`Saved project version ${version.versionNumber}.`);
      return version;
    },
    [client, scriptText]
  );

  const createProject = useCallback(
    async (draft: CreateProjectDraft) =>
      runAction("create-project", async () => {
        const effectiveWorkspaceId = workspaceId ?? createId("workspace");
        if (workspaceId === null) {
          const workspace = unwrapResponse(
            await client.createWorkspace({
              id: effectiveWorkspaceId,
              name: "Default Workspace"
            })
          );
          setWorkspaceId(workspace.id);
        }

        const project = unwrapResponse(
          await client.createProject({
            id: createId("project"),
            language: draft.language,
            name: draft.name.trim().length > 0 ? draft.name.trim() : "Untitled video",
            workspaceId: effectiveWorkspaceId
          })
        );

        setRecentProjects((projects) => upsertRecentProject(projects, project));
        setSelectedProjectId(project.id);
        setLatestVersion(null);
        setJob(null);
        setLogs([]);
        setStatusMessage(`Project "${project.name}" created.`);
        return project;
      }),
    [client, runAction, workspaceId]
  );

  const openProject = useCallback(
    async (projectId: string) =>
      runAction("open-project", async () => {
        const trimmedProjectId = projectId.trim();
        if (trimmedProjectId.length === 0) {
          throw new Error("Enter a project id to open.");
        }

        const project = unwrapResponse(await client.getProject(trimmedProjectId));
        setWorkspaceId(project.workspaceId);
        setRecentProjects((projects) => upsertRecentProject(projects, project));
        setSelectedProjectId(project.id);
        setLatestVersion(null);
        setJob(null);
        setLogs([]);
        setStatusMessage(`Project "${project.name}" opened.`);
        return project;
      }),
    [client, runAction]
  );

  const validateScript = useCallback(
    async () => runAction("validate-script", validateCurrentScript),
    [runAction, validateCurrentScript]
  );

  const saveVersion = useCallback(
    async () =>
      runAction("save-version", async () => {
        if (selectedProject === null) {
          throw new Error("Create or open a project before saving a version.");
        }

        return saveValidatedVersion(selectedProject.id);
      }),
    [runAction, saveValidatedVersion, selectedProject]
  );

  const queueRenderJob = useCallback(
    async () =>
      runAction("queue-job", async () => {
        if (selectedProject === null) {
          throw new Error("Create or open a project before queueing a render job.");
        }

        const version =
          latestVersion !== null && latestVersion.projectId === selectedProject.id
            ? latestVersion
            : await saveValidatedVersion(selectedProject.id);
        const renderJob = unwrapResponse(
          await client.createRenderJob({
            configSnapshot: {
              mode: "web-baseline",
              queuedFrom: "apps/web"
            },
            id: createId("job"),
            logPath: null,
            outputPath: null,
            projectId: selectedProject.id,
            projectVersionId: version.id,
            providerSnapshot: null,
            renderEnvironment: {
              ui: "Phase 10 Web UI baseline"
            }
          })
        );

        setJob(renderJob);
        setLogs([]);
        setStatusMessage("Render job metadata queued. Worker execution will attach logs/output in a later phase.");
        return renderJob;
      }),
    [client, latestVersion, runAction, saveValidatedVersion, selectedProject]
  );

  const refreshJob = useCallback(
    async () =>
      runAction("refresh-job", async () => {
        if (job === null) {
          throw new Error("No render job is selected.");
        }

        const refreshedJob = unwrapResponse(await client.getRenderJob(job.id));
        setJob(refreshedJob);
        setStatusMessage(`Render job status is ${refreshedJob.status}.`);
        return refreshedJob;
      }),
    [client, job, runAction]
  );

  const loadLogs = useCallback(
    async () =>
      runAction("load-logs", async () => {
        if (job === null) {
          throw new Error("No render job is selected.");
        }

        if (job.logPath === null) {
          setLogs([]);
          setStatusMessage("This job does not have a log path yet.");
          return [];
        }

        const logData = unwrapResponse(await client.getJobLogs(job.id));
        setLogs(logData.lines);
        setStatusMessage(`Loaded ${logData.lines.length} log line(s).`);
        return logData.lines;
      }),
    [client, job, runAction]
  );

  return {
    actions: {
      createProject,
      loadLogs,
      openProject,
      queueRenderJob,
      refreshJob,
      saveVersion,
      setApiBaseUrl,
      setScriptText,
      validateScript
    },
    state: {
      apiBaseUrl,
      busyAction,
      error,
      job,
      latestVersion,
      logs,
      recentProjects,
      scriptText,
      selectedProject,
      statusMessage,
      validation,
      workspaceId
    }
  };
}

function getDefaultApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return typeof configuredBaseUrl === "string" && configuredBaseUrl.trim().length > 0
    ? configuredBaseUrl
    : "http://localhost:3000";
}

function unwrapResponse<TData>(response: ApiResponse<TData>): TData {
  if (response.ok) {
    return response.data;
  }

  const details =
    response.error.technicalDetails === undefined || response.error.technicalDetails.length === 0
      ? ""
      : ` ${response.error.technicalDetails}`;
  throw new Error(`${response.error.code}: ${response.error.humanReadableMessage}${details}`);
}

function upsertRecentProject(projects: readonly RecentProject[], record: ProjectRecord): RecentProject[] {
  const nextProject: RecentProject = {
    lastOpenedAt: new Date().toISOString(),
    record
  };
  return [nextProject, ...projects.filter((project) => project.record.id !== record.id)].slice(0, 8);
}

function parseScriptText(scriptText: string): { readonly ok: true; readonly value: JsonObject } | { readonly ok: false; readonly message: string } {
  try {
    const parsed: unknown = JSON.parse(scriptText);
    if (!isJsonObject(parsed)) {
      return {
        message: "JSON Script root must be an object.",
        ok: false
      };
    }

    return {
      ok: true,
      value: parsed
    };
  } catch (caughtError) {
    return {
      message: caughtError instanceof Error ? caughtError.message : String(caughtError),
      ok: false
    };
  }
}

function createParseErrorSummary(message: string): ValidationSummary {
  return {
    issues: [
      {
        code: "UI-JSON-PARSE",
        humanReadableMessage: "JSON could not be parsed.",
        path: "/",
        technicalDetails: message
      }
    ],
    valid: false
  };
}

function readSettingsSnapshot(script: JsonObject): JsonObject {
  const settings = script.settings;
  return isJsonObject(settings) ? settings : {};
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
