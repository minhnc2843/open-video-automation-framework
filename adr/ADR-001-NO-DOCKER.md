# ADR-001: Do Not Use Docker in V1

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Môi trường phát triển chính là Windows + Laragon và không hỗ trợ/không muốn phụ thuộc WSL2 hoặc ảo hóa. Docker tăng độ phức tạp cài đặt, khó debug FFmpeg/Chromium và không phù hợp ràng buộc thực tế của dự án.

## Decision

V1 chạy trực tiếp bằng Node.js, SQLite, Playwright Chromium và FFmpeg trên Windows. Google Colab cài dependency trực tiếp trong notebook/runtime.

## Consequences

- Hướng dẫn setup phải rõ theo Windows/Colab.
- CI có thể dùng môi trường runner tiêu chuẩn, nhưng local development không yêu cầu container.
- Khi cần triển khai cloud sau này, Docker chỉ được xem xét qua ADR mới.
