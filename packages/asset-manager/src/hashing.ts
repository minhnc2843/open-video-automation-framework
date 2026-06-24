import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import type { JsonObject } from "@ovaf/contracts";
import { stableStringify } from "./stable-json.js";

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function hashJson(value: JsonObject): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}
