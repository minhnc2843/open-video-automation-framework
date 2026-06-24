# Asset Manager Package

Asset and cache primitives for Phase 05.

Current responsibilities:

- SHA-256 hashing for files, buffers and JSON objects;
- local asset record creation;
- deterministic local asset storage path derivation;
- cache metadata read/write;
- cache validity checks against fingerprint, generator version and output file existence;
- scene input fingerprint generation.

Out of scope:

- remote asset download;
- provider-generated asset orchestration;
- database-backed cache records;
- renderer integration;
- media probing/transcoding.
