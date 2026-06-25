#!/usr/bin/env python3
"""Colab setup helper for Open Video Automation Framework.

Run from the repository root in Google Colab after clone/pull.
The script creates the expected storage layout and checks required tools.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_COMMANDS = [
    ("node", ["--version"]),
    ("npm", ["--version"]),
    ("ffmpeg", ["-version"]),
    ("ffprobe", ["-version"]),
    ("chromium-browser", ["--version"]),
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


def normalize_name(command: str) -> str:
    return "chromium" if command == "chromium-browser" else command


def first_line(value: str) -> str:
    for line in value.splitlines():
        if line.strip():
            return line.strip()
    return ""


if __name__ == "__main__":
    raise SystemExit(main())
