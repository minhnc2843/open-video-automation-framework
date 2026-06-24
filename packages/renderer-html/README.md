# HTML Renderer Package

HTML scene renderer foundation for Phase 07.

Current responsibilities:

- convert a normalized Timeline scene into a standalone HTML document;
- write per-scene HTML preview files;
- capture a scene preview through a Playwright Chromium-compatible launcher;
- integrate scene render cache through deterministic scene fingerprints.

Out of scope:

- FFmpeg encoding;
- audio mixing;
- frame sequence rendering;
- provider calls;
- UI preview screens.

The capture adapter uses `playwright-core`. Tests inject a fake Chromium launcher, so unit tests do not require downloading a browser binary.
