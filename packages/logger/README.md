# Logger Package

Structured JSONL logging for Phase 06.

Current responsibilities:

- write one JSON log record per line;
- preserve job/project/stage/scene context;
- redact sensitive technical details recursively;
- add `LOGGER-REDACTION-001` when redaction occurred.

Out of scope:

- log search API;
- database log index;
- UI log viewer.
