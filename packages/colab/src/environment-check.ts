import type {
  ColabEnvironmentCheckName,
  ColabEnvironmentCheckResult,
  ColabEnvironmentReport,
  ColabRuntimeKind
} from "@ovaf/contracts";

export interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ColabEnvironmentProbe {
  readonly run: (command: string, args: readonly string[]) => Promise<CommandResult>;
  readonly pathExists: (path: string) => Promise<boolean>;
  readonly resolvePlaywrightChromiumExecutable?: () => Promise<string | undefined>;
}

export interface CheckColabEnvironmentOptions {
  readonly probe: ColabEnvironmentProbe;
  readonly now?: () => Date;
  readonly runtime?: ColabRuntimeKind;
  readonly storageRoot?: string;
  readonly googleDriveMountPath?: string;
}

const BROWSER_CANDIDATES = ["chromium", "google-chrome", "google-chrome-stable", "chrome", "chromium-browser"] as const;
const PLAYWRIGHT_PACKAGES = ["playwright", "playwright-core"] as const;

interface BrowserCandidate {
  readonly label: string;
  readonly command: string;
}

export async function checkColabEnvironment(options: CheckColabEnvironmentOptions): Promise<ColabEnvironmentReport> {
  const storageRoot = options.storageRoot ?? "/content/ovaf-storage";
  const checks: ColabEnvironmentCheckResult[] = [];

  checks.push(await checkVersionCommand(options.probe, "node", ["--version"], "node", true, 22));
  checks.push(await checkVersionCommand(options.probe, "npm", ["--version"], "npm", true, 10));
  checks.push(await checkCommand(options.probe, "ffmpeg", ["-version"], "ffmpeg", true));
  checks.push(await checkCommand(options.probe, "ffprobe", ["-version"], "ffprobe", true));
  checks.push(await checkBrowser(options.probe));
  checks.push(await checkPath(options.probe, storageRoot, "storage_root", true));

  if (options.googleDriveMountPath !== undefined) {
    checks.push(await checkPath(options.probe, options.googleDriveMountPath, "google_drive_mount", true));
  } else {
    checks.push({
      humanReadableMessage: "Google Drive mount path was not provided.",
      name: "google_drive_mount",
      ok: true,
      required: false
    });
  }

  return {
    checkedAt: (options.now ?? (() => new Date()))().toISOString(),
    checks,
    ok: checks.every((check) => check.ok || !check.required),
    runtime: options.runtime ?? "google_colab",
    storageRoot
  };
}

async function checkBrowser(probe: ColabEnvironmentProbe): Promise<ColabEnvironmentCheckResult> {
  const attempts: string[] = [];

  for (const candidate of await browserCandidates(probe, attempts)) {
    try {
      const result = await probe.run(candidate.command, ["--version"]);
      const output = firstLine(result.stdout) ?? firstLine(result.stderr) ?? `Command exited with ${result.exitCode}.`;
      const combinedOutput = `${result.stdout}\n${result.stderr}`;

      if (result.exitCode === 0 && !containsSnapLauncherOutput(combinedOutput)) {
        return {
          humanReadableMessage: `chromium is available via ${candidate.label}.`,
          name: "chromium",
          ok: true,
          required: true,
          technicalDetails: `${candidate.command}: ${output}`
        };
      }

      const reason = containsSnapLauncherOutput(combinedOutput) ? "snap launcher output" : `exit=${result.exitCode}`;
      attempts.push(`${candidate.label}: ${reason}; ${output}`);
    } catch (error) {
      attempts.push(`${candidate.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    humanReadableMessage:
      "No usable Chromium browser was found. Run `npx playwright install chromium`, set PLAYWRIGHT_BROWSERS_PATH if you use a custom browser cache, or set CHROMIUM_PATH to a Playwright-managed Chromium executable.",
    name: "chromium",
    ok: false,
    required: true,
    technicalDetails: `Tried ${attempts.join(" | ")}`
  };
}

async function browserCandidates(
  probe: ColabEnvironmentProbe,
  attempts: string[]
): Promise<readonly BrowserCandidate[]> {
  const candidates: BrowserCandidate[] = [];
  const configuredPath = process.env.CHROMIUM_PATH?.trim();
  if (configuredPath !== undefined && configuredPath.length > 0) {
    candidates.push({ command: configuredPath, label: "CHROMIUM_PATH" });
  }

  try {
    const playwrightExecutablePath = await resolvePlaywrightChromiumExecutable(probe);
    if (playwrightExecutablePath !== undefined && playwrightExecutablePath.length > 0) {
      candidates.push({
        command: playwrightExecutablePath,
        label: "Playwright-managed Chromium"
      });
    }
  } catch (error) {
    attempts.push(`Playwright-managed Chromium: ${error instanceof Error ? error.message : String(error)}`);
  }

  candidates.push(...BROWSER_CANDIDATES.map((candidate) => ({ command: candidate, label: candidate })));
  return candidates;
}

async function resolvePlaywrightChromiumExecutable(probe: ColabEnvironmentProbe): Promise<string | undefined> {
  if (probe.resolvePlaywrightChromiumExecutable !== undefined) {
    return probe.resolvePlaywrightChromiumExecutable();
  }

  for (const packageName of PLAYWRIGHT_PACKAGES) {
    try {
      const mod = await importOptionalPlaywright(packageName);
      const executablePath = mod.chromium?.executablePath?.();
      if (typeof executablePath === "string" && executablePath.length > 0) {
        return executablePath;
      }
    } catch {
      // Optional dependency: continue to the next Playwright package name.
    }
  }

  return undefined;
}

interface OptionalPlaywrightModule {
  readonly chromium?: {
    readonly executablePath?: () => string;
  };
}

async function importOptionalPlaywright(packageName: string): Promise<OptionalPlaywrightModule> {
  const importer = new Function("packageName", "return import(packageName);") as (
    packageName: string
  ) => Promise<OptionalPlaywrightModule>;
  return importer(packageName);
}

async function checkCommand(
  probe: ColabEnvironmentProbe,
  command: string,
  args: readonly string[],
  name: ColabEnvironmentCheckName,
  required: boolean
): Promise<ColabEnvironmentCheckResult> {
  try {
    const result = await probe.run(command, args);
    if (result.exitCode === 0) {
      const details = firstLine(result.stdout) || firstLine(result.stderr);
      return {
        humanReadableMessage: `${name} is available.`,
        name,
        ok: true,
        required,
        ...(details === undefined ? {} : { technicalDetails: details })
      };
    }

    return {
      humanReadableMessage: `${name} check failed.`,
      name,
      ok: false,
      required,
      technicalDetails: result.stderr || result.stdout || `Command exited with ${result.exitCode}.`
    };
  } catch (error) {
    return {
      humanReadableMessage: `${name} command could not be executed.`,
      name,
      ok: false,
      required,
      technicalDetails: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkVersionCommand(
  probe: ColabEnvironmentProbe,
  command: string,
  args: readonly string[],
  name: ColabEnvironmentCheckName,
  required: boolean,
  minimumMajor: number
): Promise<ColabEnvironmentCheckResult> {
  const commandCheck = await checkCommand(probe, command, args, name, required);
  if (!commandCheck.ok) {
    return commandCheck;
  }

  const major = parseMajorVersion(commandCheck.technicalDetails ?? "");
  if (major === null || major < minimumMajor) {
    return {
      humanReadableMessage: `${name} version is too old.`,
      name,
      ok: false,
      required,
      technicalDetails: `Expected major version >= ${minimumMajor}, got ${commandCheck.technicalDetails ?? "unknown"}.`
    };
  }

  return commandCheck;
}

async function checkPath(
  probe: ColabEnvironmentProbe,
  targetPath: string,
  name: ColabEnvironmentCheckName,
  required: boolean
): Promise<ColabEnvironmentCheckResult> {
  const exists = await probe.pathExists(targetPath);
  return {
    humanReadableMessage: exists ? `${name} exists.` : `${name} does not exist.`,
    name,
    ok: exists,
    required,
    technicalDetails: targetPath
  };
}

function firstLine(value: string): string | undefined {
  return value.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim();
}

function containsSnapLauncherOutput(value: string): boolean {
  return value.toLowerCase().includes("snap");
}

function parseMajorVersion(value: string): number | null {
  const match = /v?(\d+)(?:\.|$)/u.exec(value.trim());
  if (match?.[1] === undefined) {
    return null;
  }

  return Number(match[1]);
}
