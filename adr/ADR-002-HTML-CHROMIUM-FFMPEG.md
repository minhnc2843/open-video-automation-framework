# ADR-002: Default Renderer is HTML + Chromium + FFmpeg

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

V1 cần renderer dễ debug, phù hợp HTML/CSS animation, có preview per scene và hoạt động được trong Windows/Google Colab.

## Decision

Dùng Timeline → HTML/CSS/JavaScript → Playwright Chromium capture → FFmpeg encode/merge làm renderer mặc định.

## Consequences

- Renderer có khả năng debug cao và scene-level cache rõ ràng.
- Một số motion phức tạp hoặc video-generation fidelity sẽ không đạt được bằng renderer này; phải thông báo capability warning hoặc dùng provider/engine bổ sung ở phase sau.
