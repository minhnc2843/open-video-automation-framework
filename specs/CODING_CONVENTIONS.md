# Coding Conventions

## Purpose

Quy ước code cho repository. File này bổ sung `specs/AI_RULES.md` và không thay thế contract, schema hoặc ADR.

## Language and runtime

- TypeScript strict mode cho mọi package implementation sau Phase 00.
- Node.js 22 LTS hoặc mới hơn.
- npm workspaces là package manager baseline.
- Không thêm runtime/framework mới nếu task hoặc ADR chưa cho phép.

## Module boundaries

- `apps/web` chỉ chứa presentation logic.
- `apps/api` chỉ xử lý HTTP boundary và dispatch application services.
- `packages/core` phụ thuộc contract, không phụ thuộc provider/renderer cụ thể.
- Provider, renderer, asset manager, validator, logger và config phải có ranh giới rõ.
- Public contract/schema/database changes cần ADR hoặc proposal.

## Error handling and logs

- Không dùng `catch {}` rỗng.
- Không trả lỗi mơ hồ như `Unknown error` khi có thể nêu stage/rule cụ thể.
- Production code không dùng `console.log`; dùng logger có redaction khi logger package tồn tại.
- Secret, API key và authorization header không được ghi vào log, test fixture hoặc response.

## Code style

- Không dùng `any` trừ khi có lý do kỹ thuật rõ và comment ngắn.
- Không hardcode provider name, path, timeout hoặc magic number trong business logic.
- Function nên có trách nhiệm rõ, tránh gom orchestration phức tạp vào một hàm dài.
- Test phải đi cùng module public hoặc logic có rủi ro.

## Phase 00 note

Phase 00 chỉ thiết lập skeleton và npm baseline. Không có business logic, database schema, JSON schema hoặc public TypeScript contract trong phase này.
