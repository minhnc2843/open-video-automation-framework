# Providers Package

Provider plugin registry and shared provider composition package.

Provider-specific business logic must not enter the core pipeline.

## Phase 11 baseline

This package provides:

- `ProviderPlugin` runtime interface.
- `ProviderRegistry` for registering and discovering plugins by capability.
- `ProviderRunner` for credential validation, health checks, generation calls and cancellation.
- `ProviderCredentialVault` for AES-256-GCM credential encryption before persistence.
- Normalized provider errors using `PROVIDER-*` framework error codes.

No concrete external provider is implemented in Phase 11. Provider SDKs should live in later adapter packages or plugins and register through this boundary.

## Rules

- Do not import UI, renderer or core worker implementation code here.
- Do not return plaintext credentials from storage APIs.
- Do not log secrets in normalized provider errors.
- Do not hardcode provider-specific fallback in core pipeline code.
