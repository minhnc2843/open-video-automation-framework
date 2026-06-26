#!/usr/bin/env python3
"""Bootstrap a fresh Google Colab runtime for OVAF.

Mount Google Drive in the notebook before running this script:

from google.colab import drive
drive.mount("/content/drive")
"""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path("/content/open-video-automation-framework")
STORAGE_ROOT = Path("/content/ovaf-storage")
DRIVE_STORAGE_ROOT = Path("/content/drive/MyDrive/ovaf/storage")
SETUP_SCRIPT = REPO_ROOT / "colab" / "setup_colab.py"
STORAGE_DIRS = ["projects", "assets", "cache", "logs", "temp", "output"]


def main() -> int:
    steps: list[dict[str, object]] = []

    if Path.cwd().resolve() != REPO_ROOT:
        steps.append(
            failure(
                "repo_root",
                f"Run from {REPO_ROOT}. In a notebook cell: %cd {REPO_ROOT}",
            )
        )
        print_report(False, steps)
        return 1

    if not SETUP_SCRIPT.exists():
        steps.append(failure("repo_files", f"Missing setup script: {SETUP_SCRIPT}"))
        print_report(False, steps)
        return 1

    for name in STORAGE_DIRS:
        (STORAGE_ROOT / name).mkdir(parents=True, exist_ok=True)
    steps.append(success("storage_root", f"Created or verified {STORAGE_ROOT}."))

    drive_available = Path("/content/drive/MyDrive").exists()
    if drive_available:
        for name in STORAGE_DIRS:
            (DRIVE_STORAGE_ROOT / name).mkdir(parents=True, exist_ok=True)
        steps.append(success("drive_storage", f"Created or verified {DRIVE_STORAGE_ROOT}."))
    else:
        steps.append(
            skipped(
                "drive_storage",
                "Google Drive is not mounted. Mount it in the notebook first to enable persistent storage sync.",
            )
        )

    run_step(steps, "npm_install", ["npm", "install"])
    run_step(steps, "typecheck", ["npm", "run", "typecheck"])
    run_step(steps, "playwright_install_deps", ["npx", "playwright", "install-deps", "chromium"])
    run_step(steps, "playwright_install", ["npx", "playwright", "install", "chromium"])

    if drive_available:
        if shutil.which("rsync") is None:
            steps.append(failure("sync_drive_to_runtime", "rsync was not found; Drive storage was not copied into runtime storage."))
        else:
            run_step(
                steps,
                "sync_drive_to_runtime",
                ["rsync", "-a", f"{DRIVE_STORAGE_ROOT}/", f"{STORAGE_ROOT}/"],
            )

    setup_command = [
        "python",
        str(SETUP_SCRIPT),
        "--storage-root",
        str(STORAGE_ROOT),
    ]
    if drive_available:
        setup_command.extend(["--drive-root", str(DRIVE_STORAGE_ROOT.parent)])
    run_step(steps, "setup_colab", setup_command)

    ok = all(bool(step["ok"]) or not bool(step["required"]) for step in steps)
    print_report(ok, steps)
    return 0 if ok else 1


def run_step(
    steps: list[dict[str, object]],
    name: str,
    command: list[str],
    *,
    required: bool = True,
    skip_message: str | None = None,
) -> None:
    if not required:
        steps.append(skipped(name, skip_message or f"Skipped optional command: {' '.join(command)}"))
        return

    try:
        completed = subprocess.run(
            command,
            cwd=REPO_ROOT,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except OSError as error:
        steps.append(failure(name, str(error), command=command))
        return

    details = {
        "command": command,
        "exitCode": completed.returncode,
        "stdoutTail": tail(completed.stdout),
        "stderrTail": tail(completed.stderr),
    }
    if completed.returncode == 0:
        steps.append(success(name, f"{name} completed.", details=details))
    else:
        steps.append(failure(name, f"{name} failed with exit code {completed.returncode}.", details=details))


def print_report(ok: bool, steps: list[dict[str, object]]) -> None:
    report = {
        "ok": ok,
        "runtime": "google_colab",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(REPO_ROOT),
        "storageRoot": str(STORAGE_ROOT),
        "driveStorageRoot": str(DRIVE_STORAGE_ROOT),
        "steps": steps,
        "nextSteps": [
            "Render the example: OVAF_STORAGE_ROOT=/content/ovaf-storage npm run render -- examples/basic-vertical-short.json",
            "Sync outputs back to Drive before ending the runtime.",
        ],
    }
    print(json.dumps(report, indent=2, sort_keys=True))

    if ok:
        print("\nOVAF Colab bootstrap completed successfully.")
    else:
        print("\nOVAF Colab bootstrap failed. Read the report above and rerun after fixing the failing step.")


def success(name: str, message: str, *, details: dict[str, object] | None = None) -> dict[str, object]:
    return {
        "name": name,
        "ok": True,
        "required": True,
        "message": message,
        **({} if details is None else {"details": details}),
    }


def failure(
    name: str,
    message: str,
    *,
    command: list[str] | None = None,
    details: dict[str, object] | None = None,
) -> dict[str, object]:
    return {
        "name": name,
        "ok": False,
        "required": True,
        "message": message,
        **({} if command is None else {"command": command}),
        **({} if details is None else {"details": details}),
    }


def skipped(name: str, message: str) -> dict[str, object]:
    return {
        "name": name,
        "ok": True,
        "required": False,
        "message": message,
    }


def tail(value: str, max_chars: int = 4000) -> str:
    cleaned = value.strip()
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[-max_chars:]


if __name__ == "__main__":
    raise SystemExit(main())
