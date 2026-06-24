# Config Package

Typed runtime configuration and environment validation for Phase 01.

Current environment variables:

| Name | Required | Default | Notes |
|---|---:|---|---|
| `APP_ENV` | No | `development` | `development`, `test`, or `production`. |
| `APP_PORT` | No | `3000` | Integer from `1` to `65535`. |
| `APP_LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, or `error`. |
| `APP_STORAGE_ROOT` | No | `storage` | Root folder for runtime storage paths. |
| `APP_ENCRYPTION_KEY` | Production only | None | Must be at least 32 characters when required. Never logged or returned in config. |

The exported runtime config only exposes whether the encryption key is configured, not the key value itself.
