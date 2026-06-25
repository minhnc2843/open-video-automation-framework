import type { ReferenceVideoMetadata, StyleProfileValidationIssue } from "@ovaf/contracts";

export interface CreateReferenceVideoMetadataInput {
  readonly id: string;
  readonly fileName: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly fps?: number;
  readonly uploadedAt?: string;
}

export type ReferenceVideoMetadataResult =
  | {
      readonly ok: true;
      readonly metadata: ReferenceVideoMetadata;
    }
  | {
      readonly ok: false;
      readonly issues: readonly StyleProfileValidationIssue[];
    };

export function createReferenceVideoMetadata(input: CreateReferenceVideoMetadataInput): ReferenceVideoMetadataResult {
  const metadata: ReferenceVideoMetadata = {
    checksumSha256: input.checksumSha256,
    durationSeconds: input.durationSeconds,
    fileName: input.fileName,
    height: input.height,
    id: input.id,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storagePath: input.storagePath,
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
    width: input.width,
    ...(input.fps === undefined ? {} : { fps: input.fps })
  };
  const issues = validateReferenceVideoMetadata(metadata);

  if (issues.length > 0) {
    return {
      issues,
      ok: false
    };
  }

  return {
    metadata,
    ok: true
  };
}

export function validateReferenceVideoMetadata(metadata: ReferenceVideoMetadata): readonly StyleProfileValidationIssue[] {
  const issues: StyleProfileValidationIssue[] = [];

  validateNonEmpty(metadata.id, "/referenceVideo/id", "Reference video id is required.", issues);
  validateNonEmpty(metadata.fileName, "/referenceVideo/fileName", "Reference video file name is required.", issues);
  validateNonEmpty(metadata.storagePath, "/referenceVideo/storagePath", "Reference video storage path is required.", issues);

  if (!metadata.mimeType.startsWith("video/")) {
    issues.push(issue("/referenceVideo/mimeType", "Reference video MIME type must be a video type.", metadata.mimeType));
  }

  if (!Number.isInteger(metadata.sizeBytes) || metadata.sizeBytes <= 0) {
    issues.push(issue("/referenceVideo/sizeBytes", "Reference video size must be greater than 0.", String(metadata.sizeBytes)));
  }

  if (!/^[a-fA-F0-9]{64}$/u.test(metadata.checksumSha256)) {
    issues.push(
      issue(
        "/referenceVideo/checksumSha256",
        "Reference video checksum must be a SHA-256 hex digest.",
        metadata.checksumSha256
      )
    );
  }

  if (metadata.durationSeconds <= 0) {
    issues.push(
      issue(
        "/referenceVideo/durationSeconds",
        "Reference video duration must be greater than 0.",
        String(metadata.durationSeconds)
      )
    );
  }

  if (!Number.isInteger(metadata.width) || metadata.width <= 0) {
    issues.push(issue("/referenceVideo/width", "Reference video width must be greater than 0.", String(metadata.width)));
  }

  if (!Number.isInteger(metadata.height) || metadata.height <= 0) {
    issues.push(issue("/referenceVideo/height", "Reference video height must be greater than 0.", String(metadata.height)));
  }

  if (metadata.fps !== undefined && metadata.fps <= 0) {
    issues.push(issue("/referenceVideo/fps", "Reference video fps must be greater than 0.", String(metadata.fps)));
  }

  if (Number.isNaN(Date.parse(metadata.uploadedAt))) {
    issues.push(issue("/referenceVideo/uploadedAt", "Reference video upload timestamp must be ISO date-time.", metadata.uploadedAt));
  }

  return issues;
}

function validateNonEmpty(
  value: string,
  path: string,
  humanReadableMessage: string,
  issues: StyleProfileValidationIssue[]
): void {
  if (value.trim().length === 0) {
    issues.push(issue(path, humanReadableMessage, value));
  }
}

function issue(path: string, humanReadableMessage: string, value: string): StyleProfileValidationIssue {
  return {
    code: "REFERENCE-VIDEO-METADATA-001",
    humanReadableMessage,
    path,
    technicalDetails: `Invalid value: ${value}`
  };
}
