# Start Here

## Mục đích

Tài liệu này là điểm vào cho contributor hoặc AI agent mới. Sau khi đọc các file dưới đây, người đọc phải hiểu được hệ thống trong khoảng 30 phút: mục tiêu, giới hạn, pipeline, quy tắc thay đổi và cách bắt đầu một phase.

## Thứ tự đọc bắt buộc

1. `specs/PROJECT_MEMORY.md` — quyết định dài hạn và bối cảnh thực tế.
2. `specs/PROJECT_PRINCIPLES.md` — nguyên tắc thiết kế bắt buộc.
3. `specs/MASTER_SPEC.md` — phạm vi, nguyên tắc, contract cấp cao.
4. `architecture/SYSTEM_ARCHITECTURE.md` — module và luồng dữ liệu.
5. `specs/AI_RULES.md` — ràng buộc khi AI/contributor chỉnh code.
6. `specs/CODING_CONVENTIONS.md` — quy ước code và module boundary.
7. `docs/ROADMAP.md` — phase hiện tại và Definition of Done.
8. Prompt phase hiện tại trong `ai-prompts/`.
9. `specs/ERROR_CODES.md` và `specs/EVENT_STANDARD.md` nếu task chạm lỗi/event.
10. Contract, schema và ADR liên quan trực tiếp đến task.

## Nếu bạn là AI Agent

Không bắt đầu code chỉ từ yêu cầu ngắn. Trước khi sửa file, phải xác định:

- Task thuộc phase nào.
- File nào được phép sửa.
- Contract/schema nào bị ảnh hưởng.
- Test nào chứng minh task hoàn thành.
- Có cần tạo ADR hay không.

Nếu task yêu cầu thay public contract, JSON schema hoặc database schema nhưng chưa có quyết định rõ ràng, dừng ở mức proposal; không tự ý thay đổi.

Phase 02 đã có ADR riêng cho persistence adapter: `adr/ADR-004-PERSISTENCE-ADAPTER-PACKAGE.md`.

## Nếu bạn là contributor

Hãy bắt đầu bằng một issue hoặc ADR nếu thay đổi vượt ra ngoài bug fix nhỏ. Tất cả code mới cần có validation, structured log, error mapping và test phù hợp.

## Định nghĩa nhanh

| Khái niệm | Ý nghĩa |
|---|---|
| Project | Một video project, có script, settings, assets, logs và versions. |
| Script | JSON có cấu trúc do người dùng cung cấp. |
| Timeline | Dữ liệu đã chuẩn hóa mà renderer đọc trực tiếp. |
| Provider | Plugin gọi dịch vụ AI/TTS/media bên ngoài. |
| Renderer | Module biến timeline thành MP4. |
| Job | Một lần validate/render/export của project version. |
| Cache | Kết quả có hash để không generate/render lại nếu input không đổi. |
| ADR | Tài liệu quyết định kiến trúc có lý do và hệ quả. |
