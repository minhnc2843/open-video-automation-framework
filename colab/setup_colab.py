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
    if shutil.which(command) is None:
        return {
            "name": normalize_name(command),
            "ok": False,
            "required": True,
            "humanReadableMessage": f"{normalize_name(command)} command was not found.",
            "technicalDetails": command,
        }

    completed = subprocess.run(
        [command, *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
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
    for candidate in browser_candidates():
        command = resolve_command(candidate)
        if command is None:
            attempts.append(f"{candidate}: not found")
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
            attempts.append(f"{candidate}: {error}")
            continue
        output = first_line(completed.stdout) or first_line(completed.stderr) or f"exit={completed.returncode}"
        combined_output = f"{completed.stdout}\n{completed.stderr}".casefold()

        if completed.returncode == 0 and "snap" not in combined_output:
            return {
                "name": "chromium",
                "ok": True,
                "required": True,
                "humanReadableMessage": f"chromium is available via {candidate}.",
                "technicalDetails": f"{command}: {output}",
            }

        reason = "snap launcher output" if "snap" in combined_output else f"exit={completed.returncode}"
        attempts.append(f"{candidate}: {reason}; {output}")

    return {
        "name": "chromium",
        "ok": False,
        "required": True,
        "humanReadableMessage": (
            "No usable Chromium or Chrome browser was found. Set CHROMIUM_PATH to a "
            "Playwright-managed Chromium executable or install a compatible .deb browser such as Google Chrome."
        ),
        "technicalDetails": " | ".join(attempts),
    }


def browser_candidates() -> list[str]:
    env_path = os.environ.get("CHROMIUM_PATH", "").strip()
    return ([env_path] if env_path else []) + BROWSER_CANDIDATES


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
