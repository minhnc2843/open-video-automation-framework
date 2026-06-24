import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StructuredLogRecord } from "@ovaf/contracts";
import { redactJsonObject } from "./redaction.js";
import { JsonlLogger, sanitizeLogRecord } from "./structured-logger.js";

let tempRoot: string;

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-logger-"));
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("redactJsonObject", () => {
  it("redacts nested sensitive fields", () => {
    const result = redactJsonObject({
      provider: {
        apiKey: "secret-value",
        nested: {
          authorization: "Bearer abc"
        }
      },
      safe: "visible"
    });

    expect(result.redacted).toBe(true);
    expect(JSON.stringify(result.value)).not.toContain("secret-value");
    expect(JSON.stringify(result.value)).not.toContain("Bearer abc");
    expect(result.value).toMatchObject({
      provider: {
        apiKey: "[REDACTED]",
        nested: {
          authorization: "[REDACTED]"
        }
      },
      safe: "visible"
    });
  });
});

describe("JsonlLogger", () => {
  it("writes structured JSONL records with redacted technical details", async () => {
    const logPath = path.join(tempRoot, "job.jsonl");
    const logger = new JsonlLogger({ logPath });
    const record: StructuredLogRecord = {
      timestamp: "2026-06-24T00:00:00.000Z",
      level: "error",
      jobId: "job-1",
      projectId: "project-1",
      stage: "validation",
      status: "failed",
      errorCode: "CONFIG-ENV-001",
      humanReadableMessage: "Validation failed.",
      technicalDetails: {
        APP_ENCRYPTION_KEY: "super-secret-key",
        field: "APP_ENV"
      }
    };

    await logger.write(record);

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("super-secret-key");
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      jobId: "job-1",
      technicalDetails: {
        APP_ENCRYPTION_KEY: "[REDACTED]",
        field: "APP_ENV",
        redactionWarning: "LOGGER-REDACTION-001"
      }
    });
  });

  it("keeps records unchanged when no sensitive details exist", () => {
    const record: StructuredLogRecord = {
      timestamp: "2026-06-24T00:00:00.000Z",
      level: "info",
      humanReadableMessage: "Stage started.",
      technicalDetails: {
        stage: "validation"
      }
    };

    expect(sanitizeLogRecord(record)).toEqual(record);
  });
});
