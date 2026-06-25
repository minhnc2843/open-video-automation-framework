# Phase 11 — Provider Plugin Infrastructure

## Goal

Introduce the provider plugin boundary without adding a concrete AI provider integration.

## Scope

- Add public provider contracts to `@ovaf/contracts`:
  - provider metadata,
  - capabilities,
  - credential descriptors,
  - health check request/result,
  - normalized generation request/response,
  - cancellation result,
  - normalized provider errors.
- Add provider error codes to the error code source of truth.
- Implement `@ovaf/providers`:
  - plugin interface,
  - registry,
  - runner for validation/health/generation/cancellation,
  - credential encryption vault,
  - normalized error helper.
- Add tests for:
  - registration and capability lookup,
  - duplicate/missing provider handling,
  - credential encryption/decryption,
  - wrong-key decrypt failure,
  - health/generation operation results,
  - unsupported cancellation,
  - secret redaction in normalized errors.
- Add ADR for provider contract and package boundary.

## Non-goals

- No Gemini/OpenAI/ElevenLabs or other concrete provider.
- No provider API endpoints.
- No credential persistence table.
- No provider settings UI.
- No fallback policy beyond normalized runner results.

## Architecture Rules

- Core, renderer and UI must not depend on concrete provider SDKs.
- Provider plugins must not import UI.
- Credentials must be encrypted before persistence and never exposed in logs.
- Provider errors must use framework error codes and avoid leaking secrets.

## Definition of Done

- `npm run typecheck` passes.
- `npm test` passes.
- `npm run check` passes.
- Runtime dependency audit has no vulnerabilities.
