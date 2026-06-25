import type {
  FrameworkErrorCode,
  FrameworkErrorDescriptor,
  JsonObject,
  JsonValue,
  NormalizedProviderError
} from "@ovaf/contracts";

const SENSITIVE_KEY_PATTERN = /api[_-]?key|token|secret|authorization|password|credential/iu;
const SENSITIVE_TEXT_PATTERN =
  /(api[_-]?key|token|secret|authorization|password|credential)(\s*[:=]\s*)([^\s,;}]+)/giu;

export class ProviderInfrastructureError extends Error {
  readonly descriptor: FrameworkErrorDescriptor;

  constructor(
    code: FrameworkErrorCode,
    humanReadableMessage: string,
    options?: {
      readonly technicalDetails?: string;
      readonly cause?: unknown;
    }
  ) {
    super(humanReadableMessage);
    this.name = "ProviderInfrastructureError";
    this.descriptor = {
      category: "provider",
      code,
      humanReadableMessage,
      severity: code === "PROVIDER-CANCEL-001" ? "warning" : "error",
      ...(options?.technicalDetails === undefined ? {} : { technicalDetails: options.technicalDetails })
    };

    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function normalizeProviderError(
  error: unknown,
  fallback: {
    readonly code: FrameworkErrorCode;
    readonly humanReadableMessage: string;
    readonly providerId?: string;
    readonly retryable?: boolean;
  }
): NormalizedProviderError {
  if (isNormalizedProviderError(error)) {
    return sanitizeNormalizedProviderError(error);
  }

  const technicalDetails = toTechnicalDetails(error);
  return {
    code: fallback.code,
    humanReadableMessage: fallback.humanReadableMessage,
    retryable: fallback.retryable ?? false,
    technicalDetails,
    ...(fallback.providerId === undefined ? {} : { providerId: fallback.providerId })
  };
}

function isNormalizedProviderError(value: unknown): value is NormalizedProviderError {
  return (
    value !== null &&
    typeof value === "object" &&
    "code" in value &&
    "humanReadableMessage" in value &&
    "retryable" in value
  );
}

function toTechnicalDetails(error: unknown): JsonObject {
  if (error instanceof Error) {
    return {
      message: redactSensitiveText(error.message),
      name: error.name
    };
  }

  return {
    message: redactSensitiveText(String(error))
  };
}

function redactSensitiveText(value: string): string {
  return value.replace(SENSITIVE_TEXT_PATTERN, "$1$2[REDACTED]");
}

function sanitizeNormalizedProviderError(error: NormalizedProviderError): NormalizedProviderError {
  return {
    code: error.code,
    humanReadableMessage: redactSensitiveText(error.humanReadableMessage),
    retryable: error.retryable,
    ...(error.providerId === undefined ? {} : { providerId: error.providerId }),
    ...(error.technicalDetails === undefined ? {} : { technicalDetails: redactJsonObject(error.technicalDetails) })
  };
}

function redactJsonObject(value: JsonObject): JsonObject {
  return redactJsonValue(value, "") as JsonObject;
}

function redactJsonValue(value: JsonValue, key: string): JsonValue {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactJsonValue(item, key));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactJsonValue(entryValue, entryKey)])
    ) as JsonObject;
  }

  return value;
}
