import type {
  ColabSyncFileEntry,
  ColabSyncManifest,
  ColabSyncManifestIssue
} from "@ovaf/contracts";

export interface BuildColabSyncManifestInput {
  readonly id: string;
  readonly createdAt?: string;
  readonly direction: ColabSyncManifest["direction"];
  readonly sourceRoot: string;
  readonly targetRoot: string;
  readonly projectId?: string;
  readonly projectVersionId?: string;
  readonly jobId?: string;
  readonly files: readonly ColabSyncFileEntry[];
}

export function buildColabSyncManifest(input: BuildColabSyncManifestInput): ColabSyncManifest {
  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    direction: input.direction,
    files: sortFiles(input.files),
    id: input.id,
    sourceRoot: input.sourceRoot,
    targetRoot: input.targetRoot,
    version: "1.0",
    ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
    ...(input.projectVersionId === undefined ? {} : { projectVersionId: input.projectVersionId }),
    ...(input.jobId === undefined ? {} : { jobId: input.jobId })
  };
}

export function validateColabSyncManifest(manifest: ColabSyncManifest): readonly ColabSyncManifestIssue[] {
  const issues: ColabSyncManifestIssue[] = [];

  if (manifest.version !== "1.0") {
    issues.push(issue("/version", "Colab sync manifest version is unsupported.", manifest.version));
  }

  validateNonEmpty(manifest.id, "/id", "Colab sync manifest id is required.", issues);
  validateNonEmpty(manifest.sourceRoot, "/sourceRoot", "Colab sync source root is required.", issues);
  validateNonEmpty(manifest.targetRoot, "/targetRoot", "Colab sync target root is required.", issues);

  if (manifest.files.length === 0) {
    issues.push(issue("/files", "Colab sync manifest must include at least one file entry.", "empty"));
  }

  for (const [index, file] of manifest.files.entries()) {
    validateFileEntry(file, index, issues);
  }

  return issues;
}

export function createDefaultColabSyncFiles(options: {
  readonly includeDatabase?: boolean;
  readonly includeAssets?: boolean;
  readonly includeCache?: boolean;
  readonly includeLogs?: boolean;
  readonly includeOutput?: boolean;
} = {}): readonly ColabSyncFileEntry[] {
  const files: ColabSyncFileEntry[] = [];

  if (options.includeDatabase ?? true) {
    files.push({
      kind: "database",
      path: "projects/project-store.sqlite",
      required: true
    });
  }

  if (options.includeAssets ?? true) {
    files.push({
      kind: "asset",
      path: "assets/",
      required: true
    });
  }

  if (options.includeCache ?? true) {
    files.push({
      kind: "cache",
      path: "cache/",
      required: false
    });
  }

  if (options.includeLogs ?? true) {
    files.push({
      kind: "log",
      path: "logs/",
      required: false
    });
  }

  if (options.includeOutput ?? true) {
    files.push({
      kind: "output",
      path: "output/",
      required: false
    });
  }

  return files;
}

function validateFileEntry(
  file: ColabSyncFileEntry,
  index: number,
  issues: ColabSyncManifestIssue[]
): void {
  const path = `/files/${index}/path`;
  if (!isSafeRelativePath(file.path)) {
    issues.push(
      issue(
        path,
        "Colab sync file paths must be safe relative paths.",
        file.path
      )
    );
  }

  if (file.checksumSha256 !== undefined && !/^[a-fA-F0-9]{64}$/u.test(file.checksumSha256)) {
    issues.push(issue(`/files/${index}/checksumSha256`, "Colab sync checksum must be a SHA-256 hex digest.", file.checksumSha256));
  }

  if (file.sizeBytes !== undefined && (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 0)) {
    issues.push(issue(`/files/${index}/sizeBytes`, "Colab sync file size must be a non-negative integer.", String(file.sizeBytes)));
  }
}

function validateNonEmpty(
  value: string,
  path: string,
  humanReadableMessage: string,
  issues: ColabSyncManifestIssue[]
): void {
  if (value.trim().length === 0) {
    issues.push(issue(path, humanReadableMessage, value));
  }
}

function isSafeRelativePath(value: string): boolean {
  const normalized = value.replace(/\\/gu, "/");
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !/^[a-zA-Z]:\//u.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

function sortFiles(files: readonly ColabSyncFileEntry[]): readonly ColabSyncFileEntry[] {
  return [...files].sort((left, right) => `${left.kind}:${left.path}`.localeCompare(`${right.kind}:${right.path}`));
}

function issue(path: string, humanReadableMessage: string, technicalDetails: string): ColabSyncManifestIssue {
  return {
    code: "COLAB-SYNC-001",
    humanReadableMessage,
    path,
    technicalDetails
  };
}
