# Runtime Storage

Runtime files are stored under this directory during local or Colab execution.

Expected V1 subdirectories:

- `projects/`
- `assets/`
- `cache/`
- `logs/`
- `temp/`
- `output/`

Generated media, logs, cache files and project render outputs are ignored by Git. Keep source fixtures in `examples/` or `tests/`, not in runtime storage.
