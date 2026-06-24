# AI Rules

## Purpose

Quy tắc bắt buộc dành cho AI agent tạo, sửa hoặc review code trong repository.

## Mandatory reading order

1. `specs/PROJECT_MEMORY.md`
2. `specs/MASTER_SPEC.md`
3. `architecture/SYSTEM_ARCHITECTURE.md`
4. phase prompt / task
5. contracts, schemas, ADR liên quan
6. source code hiện có

## Before coding

AI phải xác định rõ:

- mục tiêu task;
- files in scope;
- contracts/schemas affected;
- non-goals;
- tests required;
- known risks;
- Windows/Colab execution implications.

## Forbidden actions

AI không được:

- tự đổi JSON schema, public interface, database schema hoặc folder structure;
- tự thêm provider-specific logic vào core pipeline;
- thêm Docker, WSL2, Kubernetes, Redis hoặc cloud queue khi chưa có task riêng;
- dùng `any` để né typing;
- dùng `console.log` trong code production;
- bỏ qua validation hoặc log;
- che giấu lỗi bằng `catch {}` trống;
- hardcode API key, provider name, path, timeout hoặc magic number;
- refactor module ngoài phạm vi chỉ vì “trông đẹp hơn”;
- tuyên bố test pass nếu không chạy test;
- ghi secret trong log, test fixture, docs hoặc response.

## Required behavior

AI phải:

- giữ thay đổi nhỏ, có chủ đích;
- tạo/điều chỉnh test cùng với code;
- dùng error code và structured logging;
- ghi rõ assumption và limitation;
- báo proposal nếu cần phá public contract;
- ưu tiên implementation đơn giản nhất phù hợp V1;
- đảm bảo lệnh chạy có hướng dẫn rõ cho Windows hoặc Colab.

## Final response format after a coding task

1. Phạm vi đã hoàn thành.
2. Danh sách file tạo/sửa.
3. Những quyết định kỹ thuật đáng chú ý.
4. Lệnh kiểm tra và nơi chạy lệnh.
5. Kết quả thực tế của typecheck/test/build.
6. Giới hạn, TODO hoặc rủi ro còn lại.
7. Xác nhận không thay đổi contract/schema ngoài phạm vi, hoặc liệt kê proposal nếu có.
