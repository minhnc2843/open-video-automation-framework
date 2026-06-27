import type { ApiErrorResponse, ApiSuccessResponse, FrameworkErrorCode, ScriptValidationIssue } from "@ovaf/contracts";

export function ok<TData>(data: TData): ApiSuccessResponse<TData> {
  return {
    ok: true,
    data
  };
}

export function fail(
  code: FrameworkErrorCode,
  humanReadableMessage: string,
  technicalDetails?: string,
  validationIssues?: readonly ScriptValidationIssue[]
): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      humanReadableMessage,
      ...(technicalDetails === undefined ? {} : { technicalDetails }),
      ...(validationIssues === undefined ? {} : { validationIssues })
    }
  };
}
