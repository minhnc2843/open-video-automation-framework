import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { ProviderCredentialInput } from "@ovaf/contracts";
import { ProviderInfrastructureError } from "./errors.js";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export interface EncryptedProviderCredentials {
  readonly algorithm: typeof ALGORITHM;
  readonly authTag: string;
  readonly ciphertext: string;
  readonly createdAt: string;
  readonly iv: string;
  readonly keyId: string;
}

export interface ProviderCredentialVaultOptions {
  readonly key: string;
  readonly keyId?: string;
  readonly now?: () => Date;
  readonly randomBytesProvider?: (size: number) => Buffer;
}

export class ProviderCredentialVault {
  private readonly key: Buffer;
  private readonly keyId: string;
  private readonly now: () => Date;
  private readonly randomBytesProvider: (size: number) => Buffer;

  constructor(options: ProviderCredentialVaultOptions) {
    this.key = deriveKey(options.key);
    this.keyId = options.keyId ?? "default";
    this.now = options.now ?? (() => new Date());
    this.randomBytesProvider = options.randomBytesProvider ?? randomBytes;
  }

  seal(credentials: ProviderCredentialInput): EncryptedProviderCredentials {
    const iv = this.randomBytesProvider(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      algorithm: ALGORITHM,
      authTag: authTag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      createdAt: this.now().toISOString(),
      iv: iv.toString("base64"),
      keyId: this.keyId
    };
  }

  open(envelope: EncryptedProviderCredentials): ProviderCredentialInput {
    if (envelope.algorithm !== ALGORITHM) {
      throw new ProviderInfrastructureError(
        "PROVIDER-CREDENTIALS-001",
        `Unsupported provider credential envelope algorithm "${envelope.algorithm}".`
      );
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(envelope.iv, "base64"));
      decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final()
      ]).toString("utf8");
      const parsed: unknown = JSON.parse(plaintext);

      if (!isCredentialInput(parsed)) {
        throw new ProviderInfrastructureError("PROVIDER-CREDENTIALS-001", "Provider credential envelope payload is invalid.");
      }

      return parsed;
    } catch (error) {
      if (error instanceof ProviderInfrastructureError) {
        throw error;
      }

      throw new ProviderInfrastructureError("PROVIDER-CREDENTIALS-001", "Provider credentials could not be decrypted.", {
        cause: error
      });
    }
  }
}

function deriveKey(key: string): Buffer {
  if (key.trim().length < 32) {
    throw new ProviderInfrastructureError(
      "PROVIDER-CREDENTIALS-001",
      "Provider credential encryption key must contain at least 32 characters."
    );
  }

  return createHash("sha256").update(key, "utf8").digest();
}

function isCredentialInput(value: unknown): value is ProviderCredentialInput {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}
