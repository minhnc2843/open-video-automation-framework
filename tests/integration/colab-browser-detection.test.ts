import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { delimiter } from "node:path";
import { describe, expect, it } from "vitest";
import type { ColabEnvironmentReport } from "../../packages/contracts/src/index.js";
import { checkColabEnvironment, type ColabEnvironmentProbe, type CommandResult } from "../../packages/colab/src/index.js";

describe("Colab browser detection integration", () => {
  it("accepts Playwright-managed Chromium when system browser candidates are missing", async () => {
    const playwrightPath = "/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome";
    const report = await checkColabEnvironment({
      probe: createProbe({
        commands: {
          [`${playwrightPath} --version`]: { exitCode: 0, stderr: "", stdout: "Chromium 130.0.0\n" },
          "ffmpeg -version": { exitCode: 0, stderr: "", stdout: "ffmpeg version 7.0\n" },
          "ffprobe -version": { exitCode: 0, stderr: "", stdout: "ffprobe version 7.0\n" },
          "node --version": { exitCode: 0, stderr: "", stdout: "v22.3.0\n" },
          "npm --version": { exitCode: 0, stderr: "", stdout: "10.8.1\n" }
        },
        paths: ["/content/ovaf-storage"],
        playwrightExecutablePath: playwrightPath
      })
    });

    expect(report.ok).toBe(true);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          humanReadableMessage: "chromium is available via Playwright-managed Chromium.",
          name: "chromium",
          ok: true,
          technicalDetails: expect.stringContaining(playwrightPath)
        })
      ])
    );
  });

  it("setup_colab.py resolves Chromium from PLAYWRIGHT_BROWSERS_PATH", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "ovaf-colab-browser-"));
    const browsersPath = path.join(tempRoot, "ms-playwright");
    const fakeBinPath = path.join(tempRoot, "bin");
    const storageRoot = path.join(tempRoot, "storage");

    try {
      mkdirSync(fakeBinPath, { recursive: true });
      writeFakeCommand(fakeBinPath, "npm", "10.8.1");
      writeFakeCommand(fakeBinPath, "ffmpeg", "ffmpeg version 7.0");
      writeFakeCommand(fakeBinPath, "ffprobe", "ffprobe version 7.0");
      const executablePath = resolvePlaywrightExecutablePath(browsersPath);
      mkdirSync(path.dirname(executablePath), { recursive: true });
      copyFileSync(process.execPath, executablePath);
      chmodSync(executablePath, 0o755);

      const result = spawnSync("python", ["colab/setup_colab.py", "--storage-root", storageRoot, "--no-fail"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: withoutChromiumPath({
          ...process.env,
          PATH: `${fakeBinPath}${delimiter}${process.env.PATH ?? ""}`,
          PLAYWRIGHT_BROWSERS_PATH: browsersPath
        })
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout) as ColabEnvironmentReport;
      expect(report.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            humanReadableMessage: "chromium is available via Playwright-managed Chromium.",
            name: "chromium",
            ok: true,
            technicalDetails: expect.stringContaining(executablePath)
          })
        ])
      );
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  }, 30000);
});

function resolvePlaywrightExecutablePath(browsersPath: string): string {
  const script = "const mod = await import('playwright-core'); process.stdout.write(mod.chromium.executablePath());";
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath
    }
  });

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return result.stdout.trim();
}

function withoutChromiumPath(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  delete next.CHROMIUM_PATH;
  return next;
}

function writeFakeCommand(directory: string, name: string, output: string): void {
  if (process.platform === "win32") {
    const commandPath = path.join(directory, `${name}.cmd`);
    writeFileSync(commandPath, `@echo ${output}\r\nexit /B 0\r\n`);
    return;
  }

  const commandPath = path.join(directory, name);
  writeFileSync(commandPath, `#!/usr/bin/env sh\necho "${output}"\n`);
  chmodSync(commandPath, 0o755);
}

function createProbe(options: {
  readonly commands: Record<string, CommandResult>;
  readonly paths: readonly string[];
  readonly playwrightExecutablePath: string;
}): ColabEnvironmentProbe {
  return {
    pathExists: async (targetPath) => options.paths.includes(targetPath),
    resolvePlaywrightChromiumExecutable: async () => options.playwrightExecutablePath,
    run: async (command, args) => {
      const result = options.commands[[command, ...args].join(" ")];
      if (result === undefined) {
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      }

      return result;
    }
  };
}
