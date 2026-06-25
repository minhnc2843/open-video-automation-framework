import path from "node:path";
import type { RuntimeStoragePaths } from "@ovaf/contracts";

export function buildColabStoragePaths(storageRoot = "/content/ovaf-storage"): RuntimeStoragePaths {
  return {
    assets: path.join(storageRoot, "assets"),
    cache: path.join(storageRoot, "cache"),
    logs: path.join(storageRoot, "logs"),
    output: path.join(storageRoot, "output"),
    projects: path.join(storageRoot, "projects"),
    temp: path.join(storageRoot, "temp")
  };
}
