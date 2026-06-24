import type {
  CreateProjectRequest,
  CreateProjectVersionRequest,
  CreateRenderJobRequest,
  CreateWorkspaceRequest,
  JsonObject,
  ValidateScriptRequest
} from "@ovaf/contracts";

export function isCreateWorkspaceRequest(value: unknown): value is CreateWorkspaceRequest {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.name);
}

export function isCreateProjectRequest(value: unknown): value is CreateProjectRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.workspaceId) &&
    isNonEmptyString(value.name) &&
    (value.language === "vi" || value.language === "en")
  );
}

export function isCreateProjectVersionRequest(value: unknown): value is CreateProjectVersionRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isRecord(value.scriptSnapshot) &&
    isRecord(value.settingsSnapshot) &&
    (value.styleProfileSnapshot === undefined || value.styleProfileSnapshot === null || isRecord(value.styleProfileSnapshot))
  );
}

export function isValidateScriptRequest(value: unknown): value is ValidateScriptRequest {
  return (
    isRecord(value) &&
    "script" in value &&
    (value.existingAssetPaths === undefined ||
      (Array.isArray(value.existingAssetPaths) && value.existingAssetPaths.every((item) => typeof item === "string")))
  );
}

export function isCreateRenderJobRequest(value: unknown): value is CreateRenderJobRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.projectId) &&
    isNonEmptyString(value.projectVersionId) &&
    isRecord(value.configSnapshot) &&
    (value.providerSnapshot === undefined || value.providerSnapshot === null || isRecord(value.providerSnapshot)) &&
    (value.renderEnvironment === undefined || value.renderEnvironment === null || isRecord(value.renderEnvironment)) &&
    (value.logPath === undefined || value.logPath === null || isNonEmptyString(value.logPath)) &&
    (value.outputPath === undefined || value.outputPath === null || isNonEmptyString(value.outputPath))
  );
}

export function getRouteParam(params: unknown, name: string): string | null {
  if (!isRecord(params)) {
    return null;
  }

  const value = params[name];
  return isNonEmptyString(value) ? value : null;
}

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
