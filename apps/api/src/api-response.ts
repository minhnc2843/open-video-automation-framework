import type { ApiErrorResponse, ApiSuccessResponse, FrameworkErrorCode } from "@ovaf/contracts";

export function ok<TData>(data: TData): ApiSuccessResponse<TData> {
  return {
    ok: true,
    data
  };
}

export function fail(
  code: FrameworkErrorCode,
  humanReadableMessage: string,
  technicalDetails?: string
): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      humanReadableMessage,
      ...(technicalDetails === undefined ? {} : { technicalDetails })
    }
  };
}
