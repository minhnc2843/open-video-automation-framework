# Core Package

Core pipeline primitives for Phase 06.

Current responsibilities:

- persisted job state transition rules;
- single-worker execution skeleton using injected stage handlers;
- retry/recoverable policy skeleton.

Out of scope:

- concrete validator/timeline/renderer orchestration;
- provider implementation;
- API/UI dependencies;
- SQLite-specific code.
