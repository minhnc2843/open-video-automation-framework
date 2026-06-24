import { loadRuntimeConfigFromProcess } from "@ovaf/config";
import { SqliteProjectRepository } from "../sqlite-project-repository.js";

const config = loadRuntimeConfigFromProcess();
const repository = SqliteProjectRepository.open({
  databasePath: config.databasePath,
  migrate: false
});

try {
  const appliedMigrations = repository.migrate();
  const message =
    appliedMigrations.length === 0
      ? "Database already up to date."
      : `Applied migrations: ${appliedMigrations.join(", ")}`;

  process.stdout.write(`${message}\n`);
} finally {
  repository.close();
}
