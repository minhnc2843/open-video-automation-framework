import { loadRuntimeConfigFromProcess } from "@ovaf/config";
import { SqliteProjectRepository } from "@ovaf/persistence";
import { buildApiApp } from "./app.js";

const config = loadRuntimeConfigFromProcess();
const repository = SqliteProjectRepository.open({
  databasePath: config.databasePath
});
const app = buildApiApp({
  repository,
  storageRoot: config.storageRoot
});

const close = async (): Promise<void> => {
  await app.close();
  repository.close();
};

process.on("SIGINT", () => {
  void close().finally(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  void close().finally(() => {
    process.exit(0);
  });
});

try {
  await app.listen({
    host: "127.0.0.1",
    port: config.port
  });
  process.stdout.write(`OVAF API listening at http://127.0.0.1:${config.port}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  repository.close();
  process.exitCode = 1;
}
