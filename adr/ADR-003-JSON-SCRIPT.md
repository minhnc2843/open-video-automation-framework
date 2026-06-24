# ADR-003: JSON Script is the Primary Structured Input

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Prompt tự do dễ gây kết quả không ổn định và khó debug. Người dùng muốn chủ động viết kịch bản để hạn chế lỗi ở khâu AI hiểu nội dung.

## Decision

Code Mode nhận JSON Script đã có schema. Renderer chỉ chạy trên Timeline sinh từ Script hợp lệ. AI có thể hỗ trợ tạo asset trong API Mode nhưng không được thay Script bằng suy diễn mơ hồ.

## Consequences

- Cần validator và editor/import JSON tốt.
- Hệ thống dễ test, cache và recovery hơn.
- Tự động viết script bằng LLM có thể là feature tương lai, nhưng không được là dependency của V1.
