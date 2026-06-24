import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { JsonObject, StructuredLogRecord } from "@ovaf/contracts";
import { redactJsonObject } from "./redaction.js";

export interface JsonlLoggerOptions {
  readonly logPath: string;
}

export class JsonlLogger {
  readonly logPath: string;

  constructor(options: JsonlLoggerOptions) {
    this.logPath = options.logPath;
  }

  async write(record: StructuredLogRecord): Promise<void> {
    await mkdir(path.dirname(this.logPath), { recursive: true });
    const sanitized = sanitizeLogRecord(record);
    await appendFile(this.logPath, `${JSON.stringify(sanitized)}\n`, "utf8");
  }
}

export function sanitizeLogRecord(record: StructuredLogRecord): StructuredLogRecord {
  if (record.technicalDetails === undefined) {
    return record;
  }

  const redaction = redactJsonObject(record.technicalDetails);
  const technicalDetails: JsonObject = redaction.redacted
    ? {
        ...redaction.value,
        redactionWarning: "LOGGER-REDACTION-001"
      }
    : redaction.value;

  return {
    ...record,
    technicalDetails
  };
}
