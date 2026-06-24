import { z } from "zod";
import type { FrameworkErrorDescriptor, RuntimeStoragePaths } from "@ovaf/contracts";

const appEnvironmentSchema = z.enum(["development", "test", "production"]);
const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const environmentSchema = z
  .object({
    APP_ENV: appEnvironmentSchema.default("development"),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_LOG_LEVEL: logLevelSchema.default("info"),
    APP_STORAGE_ROOT: z.string().trim().min(1).default("storage"),
    APP_ENCRYPTION_KEY: z.string().trim().min(32).optional()
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === "production" && value.APP_ENCRYPTION_KEY === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENCRYPTION_KEY"],
        message: "APP_ENCRYPTION_KEY is required in production."
      });
    }
  });

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type LogLevel = z.infer<typeof logLevelSchema>;

export interface RuntimeConfig {
  readonly environment: AppEnvironment;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly storageRoot: string;
  readonly storagePaths: RuntimeStoragePaths;
  readonly encryptionKeyConfigured: boolean;
}

export interface ConfigValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ConfigValidationError extends Error {
  readonly descriptor: FrameworkErrorDescriptor;
  readonly issues: readonly ConfigValidationIssue[];

  constructor(issues: readonly ConfigValidationIssue[]) {
    super("Runtime environment configuration is invalid.");
    this.name = "ConfigValidationError";
    this.issues = issues;
    this.descriptor = {
      code: "CONFIG-ENV-001",
      category: "configuration",
      severity: "fatal",
      humanReadableMessage: "Runtime environment configuration is invalid.",
      technicalDetails: issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")
    };
  }
}

export type EnvironmentInput = Record<string, string | undefined>;

export function loadRuntimeConfig(environment: EnvironmentInput): RuntimeConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new ConfigValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    );
  }

  const storageRoot = result.data.APP_STORAGE_ROOT;

  return {
    environment: result.data.APP_ENV,
    port: result.data.APP_PORT,
    logLevel: result.data.APP_LOG_LEVEL,
    storageRoot,
    storagePaths: {
      projects: `${storageRoot}/projects`,
      assets: `${storageRoot}/assets`,
      cache: `${storageRoot}/cache`,
      logs: `${storageRoot}/logs`,
      temp: `${storageRoot}/temp`,
      output: `${storageRoot}/output`
    },
    encryptionKeyConfigured: result.data.APP_ENCRYPTION_KEY !== undefined
  };
}

export function loadRuntimeConfigFromProcess(): RuntimeConfig {
  return loadRuntimeConfig(process.env);
}
