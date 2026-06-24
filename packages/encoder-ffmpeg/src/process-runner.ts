import { spawn } from "node:child_process";
import type { FfmpegCommand, ProcessRunResult, ProcessRunner } from "@ovaf/contracts";

export const nodeProcessRunner: ProcessRunner = {
  run: runProcess
};

export function runProcess(command: FfmpegCommand): Promise<ProcessRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.executablePath, command.args, {
      shell: false,
      windowsHide: true
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      });
    });
  });
}
