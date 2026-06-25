import { fileURLToPath } from "node:url";

export function getDefaultStyleProfileSchemaPath(): string {
  return fileURLToPath(new URL("../../../schemas/style-profile.schema.json", import.meta.url));
}
