# Timeline Package

Timeline engine for Phase 04.

This package converts a validated JSON Script into a deterministic normalized Timeline. It does not validate raw JSON shape, call providers, resolve assets or render HTML.

Current responsibilities:

- assign scene start/end seconds;
- assign frame boundaries from configured FPS;
- preserve layer order as `zIndex`;
- derive voice/subtitle cues when enabled;
- compute deterministic input fingerprint;
- detect timeline overlap, overflow and invalid timing boundaries.
