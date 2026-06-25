# ADR-006: Provider Plugin Infrastructure Package

## Status

Accepted

## Context

Phase 11 introduces the provider plugin boundary. Providers may call external AI, TTS or media services, but renderer, UI and core pipeline modules must not depend on concrete provider implementations or credentials.

The framework needs a stable contract for provider metadata, capabilities, health checks, normalized generation requests/responses, cancellation and errors. It also needs a local composition package that can register plugins and protect provider credentials at rest.

## Decision

- Add provider public contracts to `@ovaf/contracts`.
- Implement provider composition primitives in `@ovaf/providers`.
- Keep provider plugins replaceable through a registry.
- Normalize provider errors into framework error codes.
- Encrypt provider credentials with an explicit vault boundary before persistence.
- Do not add any concrete provider integration in Phase 11.

## Consequences

- Core, renderer and UI can depend on provider contracts without knowing concrete provider SDKs.
- Adding a real provider later should require implementing the plugin interface and registering it at the composition root.
- Credential storage has a single encryption/decryption boundary that can later be wired to persistence or platform key management.
- Public provider contract changes after this ADR need a follow-up ADR or proposal.
