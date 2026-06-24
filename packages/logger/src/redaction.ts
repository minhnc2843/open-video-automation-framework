import type { JsonObject, JsonValue } from "@ovaf/contracts";

const SENSITIVE_KEY_PATTERN = /api[_-]?key|token|secret|authorization|password|credential|encryption[_-]?key/iu;
const REDACTED_VALUE = "[REDACTED]";

export interface RedactionResult {
  readonly value: JsonObject;
  readonly redacted: boolean;
}

export function redactJsonObject(value: JsonObject): RedactionResult {
  const result = redactValue(value, "");

  return {
    value: result.value as JsonObject,
    redacted: result.redacted
  };
}

function redactValue(value: JsonValue, key: string): { readonly value: JsonValue; readonly redacted: boolean } {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return {
      value: REDACTED_VALUE,
      redacted: true
    };
  }

  if (Array.isArray(value)) {
    let redacted = false;
    const items = value.map((item) => {
      const child = redactValue(item, key);
      redacted = redacted || child.redacted;
      return child.value;
    });

    return {
      value: items,
      redacted
    };
  }

  if (value !== null && typeof value === "object") {
    let redacted = false;
    const entries = Object.entries(value).map(([entryKey, entryValue]) => {
      const child = redactValue(entryValue, entryKey);
      redacted = redacted || child.redacted;
      return [entryKey, child.value] as const;
    });

    return {
      value: Object.fromEntries(entries) as JsonObject,
      redacted
    };
  }

  return {
    value,
    redacted: false
  };
}
