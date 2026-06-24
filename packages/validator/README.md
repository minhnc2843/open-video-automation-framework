# Validator Package

JSON Script validation for Phase 03.

The structural source of truth is `schemas/json-script.schema.json`. This package loads that schema with Ajv and then applies semantic rules that require project context, such as total duration matching and asset existence checks.

Current checks:

- schema shape and required fields;
- V1 fixed 9:16, 1080x1920 and duration under 60 seconds;
- total scene duration equals configured `maxDurationSeconds`;
- voice text exists when voice is enabled;
- subtitle text can be derived when subtitles are enabled;
- layer ids are unique within each scene;
- referenced assets exist in the provided asset set.
