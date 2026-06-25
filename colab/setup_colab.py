#!/usr/bin/env python3
"""Colab setup helper for Open Video Automation Framework.

Run from the repository root in Google Colab after clone/pull.
The script creates the expected storage layout and checks required tools.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_COMMANDS = [
    ("node", ["--version"]),
    ("npm", ["--version"]),
    ("ffmpeg", ["-version"]),
    ("ffprobe", ["-version"]),
]

BROWSER_CANDIDATES = [
    "chromium",
    "google-chrome",
    "google-chrome-stable",
    "chrome",
    "chromium-browser",
]

PLAYWRIGHT_RESOLVE_SCRIPT = """
const packages = ["playwright", "playwright-core"];
let lastError;
for (const packageName of packages) {
  try {
    const mod = await import(packageName);
    const executablePath = mod.chromium?.executablePath?.();
    if (executablePath) {
      process.stdout.write(executablePath);
      process.exit(0);
    }
  } catch (error) {
    lastError = error;
  }
}
process.stderr.write(lastError instanceof Error ? lastError.message : "Playwright is not installed.");
process.exit(1);
"""

STORAGE_DIRS = ["projects", "assets", "cache", "logs", "temp", "output"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare and check a Colab OVAF runtime.")
    parser.add_argument("--storage-root", default="/content/ovaf-storage")
    parser.add_argument("--drive-root", default="")
    parser.add_argument("--no-fail", action="store_true", help="Print report but exit 0 even if checks fail.")
    args = parser.parse_args()

    storage_root = Path(args.storage_root)
    for name in STORAGE_DIRS:
        (storage_root / name).mkdir(parents=True, exist_ok=True)

    checks = []
    for command, command_args in REQUIRED_COMMANDS:
        checks.append(check_command(command, command_args))
    checks.append(check_browser())

    checks.append(
        {
            "name": "storage_root",
            "ok": storage_root.exists(),
            "required": True,
            "humanReadableMessage": "storage_root exists." if storage_root.exists() else "storage_root does not exist.",
            "technicalDetails": str(storage_root),
        }
    )

    if args.drive_root:
        drive_root = Path(args.drive_root)
        checks.append(
            {
                "name": "google_drive_mount",
                "ok": drive_root.exists(),
                "required": True,
                "humanReadableMessage": "google_drive_mount exists."
                if drive_root.exists()
                else "google_drive_mount does not exist.",
                "technicalDetails": str(drive_root),
            }
        )

    report = {
        "ok": all(check["ok"] or not check["required"] for check in checks),
        "runtime": "google_colab",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "storageRoot": str(storage_root),
        "checks": checks,
    }
    print(json.dumps(report, indent=2, sort_keys=True))

    return 0 if report["ok"] or args.no_fail else 1


def check_command(command: str, args: list[str]) -> dict[str, object]:
    command_path = shutil.which(command)
    if command_path is None:
        return {
            "name": normalize_name(command),
            "ok": False,
            "required": True,
            "humanReadableMessage": f"{normalize_name(command)} command was not found.",
            "technicalDetails": command,
        }

    try:
        completed = subprocess.run(
            [command_path, *args],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except OSError as error:
        return {
            "name": normalize_name(command),
            "ok": False,
            "required": True,
            "humanReadableMessage": f"{normalize_name(command)} command could not be executed.",
            "technicalDetails": str(error),
        }

    output = first_line(completed.stdout) or first_line(completed.stderr) or f"exit={completed.returncode}"
    return {
        "name": normalize_name(command),
        "ok": completed.returncode == 0,
        "required": True,
        "humanReadableMessage": f"{normalize_name(command)} is available."
        if completed.returncode == 0
        else f"{normalize_name(command)} check failed.",
        "technicalDetails": output,
    }


def check_browser() -> dict[str, object]:
    attempts = []
    for label, candidate in browser_candidates(attempts):
        command = resolve_command(candidate)
        if command is None:
            attempts.append(f"{label}: not found")
            continue

        try:
            completed = subprocess.run(
                [command, "--version"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except OSError as error:
            attempts.append(f"{label}: {error}")
            continue
        output = first_line(completed.stdout) or first_line(completed.stderr) or f"exit={completed.returncode}"
        combined_output = f"{completed.stdout}\n{completed.stderr}".casefold()

        if completed.returncode == 0 and "snap" not in combined_output:
            return {
                "name": "chromium",
                "ok": True,
                "required": True,
                "humanReadableMessage": f"chromium is available via {label}.",
                "technicalDetails": f"{command}: {output}",
            }

        reason = "snap launcher output" if "snap" in combined_output else f"exit={completed.returncode}"
        attempts.append(f"{label}: {reason}; {output}")

    return {
        "name": "chromium",
        "ok": False,
        "required": True,
        "humanReadableMessage": (
            "No usable Chromium browser was found. Run `npx playwright install chromium`, "
            "set PLAYWRIGHT_BROWSERS_PATH if you use a custom browser cache, or set CHROMIUM_PATH "
            "to a Playwright-managed Chromium executable."
        ),
        "technicalDetails": " | ".join(attempts),
    }


def browser_candidates(attempts: list[str]) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    env_path = os.environ.get("CHROMIUM_PATH", "").strip()
    if env_path:
        candidates.append(("CHROMIUM_PATH", env_path))

    playwright_path, playwright_error = resolve_playwright_chromium_executable()
    if playwright_path:
        candidates.append(("Playwright-managed Chromium", playwright_path))
    elif playwright_error:
        attempts.append(f"Playwright-managed Chromium: {playwright_error}")

    candidates.extend((candidate, candidate) for candidate in BROWSER_CANDIDATES)
    return candidates


def resolve_playwright_chromium_executable() -> tuple[str | None, str | None]:
    node_path = shutil.which("node")
    if node_path is None:
        return None, "node command was not found"

    try:
        completed = subprocess.run(
            [node_path, "--input-type=module", "-e", PLAYWRIGHT_RESOLVE_SCRIPT],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except OSError as error:
        return None, str(error)

    executable_path = completed.stdout.strip()
    if completed.returncode == 0 and executable_path:
        return executable_path, None

    return None, first_line(completed.stderr) or first_line(completed.stdout) or f"exit={completed.returncode}"


def resolve_command(candidate: str) -> str | None:
    if "/" in candidate or "\\" in candidate:
        return candidate if Path(candidate).exists() else None
    return shutil.which(candidate)


def normalize_name(command: str) -> str:
    return "chromium" if command == "chromium-browser" else command


def first_line(value: str) -> str:
    for line in value.splitlines():
        if line.strip():
            return line.strip()
    return ""


if __name__ == "__main__":
    raise SystemExit(main())
