# PROJECT_PRINCIPLES

> Status: Active  
> Scope: Toàn bộ repository, kiến trúc, code, tài liệu và prompt cho AI Agent.  
> Source of Truth: Tài liệu này định nghĩa các nguyên tắc thiết kế. Khi có xung đột với một tài liệu triển khai chi tiết hơn, cần tạo ADR để làm rõ; không tự ý diễn giải khác đi.

## 1. Mục đích

Dự án ưu tiên xây dựng một nền tảng tự động hóa video có thể bảo trì và mở rộng lâu dài, thay vì một demo tạo video nhanh.

Mọi quyết định kỹ thuật phải được đánh giá theo câu hỏi:

> Sau 2 năm, một contributor hoặc AI Agent mới có thể hiểu, kiểm thử và thay đổi phần này mà không phá vỡ hệ thống hay không?

Nếu câu trả lời là không, giải pháp đó chưa đạt yêu cầu.

---

## 2. Các nguyên tắc cốt lõi

### P-01 — Specification trước code

Không bắt đầu bằng code khi chưa xác định rõ:

- Mục tiêu.
- Phạm vi.
- Input và output.
- Contract.
- Tiêu chí nghiệm thu.
- Rủi ro và giới hạn.

Thứ tự chuẩn:

```text
Specification → Contract → Validation → Implementation → Tests → Documentation
```

Không đi theo hướng:

```text
Ý tưởng → Code nhanh → Sửa lỗi ngẫu nhiên
```

---

### P-02 — JSON Script là nguồn dữ liệu video

Video được mô tả bằng JSON Script hợp lệ.

JSON Script là đầu vào chuẩn cho Validator và Timeline Builder. Renderer không tự diễn giải prompt tự do, không tự quyết định scene, không tự tạo logic nội dung.

Luồng chuẩn:

```text
JSON Script → Validator → Timeline → Renderer → Output Video
```

Mọi thay đổi JSON Schema phải được thực hiện qua ADR và cập nhật schema/source of truth liên quan.

---

### P-03 — Renderer độc lập với AI Provider

Renderer chỉ nhận Timeline, assets và render settings đã chuẩn hóa.

Renderer không được:

- Biết Gemini, OpenAI, Claude hoặc provider cụ thể nào.
- Đọc API key.
- Tự gọi LLM.
- Tự suy đoán nội dung video.
- Chứa logic fallback provider.

AI Provider chỉ có trách nhiệm tạo hoặc phân tích tài nguyên; Pipeline chuẩn hóa kết quả trước khi đưa sang Renderer.

---

### P-04 — Pipeline độc lập với UI

Frontend chỉ hiển thị dữ liệu và gửi yêu cầu.

Business logic, job orchestration, validation, provider fallback, render state và retry phải nằm ngoài React component.

UI có thể thay đổi mà không yêu cầu thay đổi Pipeline. Pipeline có thể chạy từ API, CLI hoặc Google Colab mà không phụ thuộc browser UI.

---

### P-05 — Contract trước implementation

Mọi ranh giới giữa module phải có contract rõ ràng:

- Provider contract.
- Renderer contract.
- Event contract.
- Timeline contract.
- Project contract.
- Error contract.

Không được sửa public contract, schema hoặc event payload chỉ để làm một task dễ hơn.

Khi bắt buộc phải thay đổi, phải tạo ADR/RFC, chỉ rõ ảnh hưởng tương thích ngược và kế hoạch migration.

---

### P-06 — Validation trước render

Không cho phép render khi dữ liệu không hợp lệ.

Tối thiểu phải kiểm tra:

- JSON Script hợp lệ.
- Video chỉ là 9:16.
- Tổng thời lượng nhỏ hơn 60 giây.
- Scene có duration hợp lệ.
- Asset tồn tại.
- Voice/subtitle/music có dữ liệu cần thiết khi được bật.
- Provider credentials hợp lệ nếu Provider được yêu cầu.
- Timeline không có overlap hoặc gap không hợp lệ.

Lỗi phải được trả về có mã lỗi, stage, scene liên quan và hướng khắc phục.

---

### P-07 — Observability là tính năng bắt buộc

Mọi pipeline stage, provider call, cache decision, render operation và retry phải ghi structured log.

Không dùng lỗi mơ hồ như:

```text
Something went wrong
Unknown error
Render failed
```

Log tối thiểu phải có:

- `jobId`
- `projectId`
- `stage`
- `status`
- `durationMs`
- `sceneId` khi có
- `errorCode` khi có
- `technicalDetails`
- `humanReadableMessage`

Không log secret, API key hoặc dữ liệu nhạy cảm.

---

### P-08 — Cache trước khi generate hoặc render lại

Cache không phải phần tối ưu thêm sau; cache là một phần của kiến trúc.

Nếu input và version engine không đổi, hệ thống phải tái sử dụng cache hợp lệ cho:

- Asset.
- Voice.
- Subtitle.
- Scene render.
- Frame.
- Output trung gian.

Khi chỉ Scene 8 thay đổi, không được render lại các scene không đổi.

---

### P-09 — Fail rõ ràng, không fail âm thầm

Không có `catch {}` rỗng.

Không nuốt exception.

Không trả thành công giả.

Nếu một khả năng chưa hỗ trợ, hệ thống phải báo rõ:

- Tính năng nào không hỗ trợ.
- Stage nào bị ảnh hưởng.
- Mã lỗi hoặc warning.
- Fallback khả dụng.
- Có thể tiếp tục hay phải dừng.

---

### P-10 — Plugin thay thế được, core ổn định

Provider, renderer, voice engine, subtitle engine, effect, transition và storage adapter có thể được bổ sung qua plugin/adapter.

Core không được phụ thuộc vào implementation cụ thể của plugin.

Plugin không được phụ thuộc UI.

Thêm plugin mới không được yêu cầu sửa logic cốt lõi ngoài registry/composition root đã định nghĩa.

---

### P-11 — Một nguồn chân lý cho mỗi loại dữ liệu

Không sao chép định nghĩa giữa nhiều file.

| Loại nội dung | Nguồn duy nhất |
|---|---|
| JSON schema | `schemas/` |
| Public contracts | `contracts/` và `packages/contracts/` |
| Mã lỗi | `specs/ERROR_CODES.md` |
| Event names/payload | `specs/EVENT_STANDARD.md` |
| Quyết định kiến trúc | `adr/` |
| Runtime configuration | config typed + environment variables |
| Project metadata | SQLite + project storage |

Tài liệu khác phải liên kết đến nguồn này, không chép lại toàn bộ định nghĩa.

---

### P-12 — Bảo mật mặc định

API key và dữ liệu nhạy cảm phải được bảo vệ từ thiết kế.

Bắt buộc:

- Không commit `.env`.
- Không log API key.
- Không trả API key về frontend sau khi lưu.
- Không đặt API key trong JSON Script.
- Không hardcode encryption key.
- Không đưa secret vào error message.
- Chỉ dùng `.env.example` để mô tả biến môi trường.

---

### P-13 — Windows và Google Colab là môi trường hạng nhất

Dự án phải chạy được trên Windows mà không cần Docker, WSL hoặc ảo hóa.

Google Colab là môi trường dành cho render nặng, không phải một backend production luôn bật.

Mọi script vận hành phải chỉ rõ:

- Chạy ở đâu.
- Lệnh nào cần chạy.
- Điều kiện tiên quyết.
- Output mong đợi.
- Cách xử lý lỗi phổ biến.

Không đưa Docker vào tài liệu, tooling hoặc dependency pipeline của V1.

---

### P-14 — Tương thích ngược có chủ đích

Không thay đổi cấu trúc project, schema, API hoặc contract một cách âm thầm.

Khi có thay đổi phá vỡ tương thích:

1. Tạo ADR/RFC.
2. Ghi rõ lý do.
3. Xác định dữ liệu/module bị ảnh hưởng.
4. Tạo migration path.
5. Cập nhật tests và docs.
6. Chỉ triển khai khi proposal được chấp thuận.

---

### P-15 — Làm nhỏ, kiểm thử xong, rồi mới mở rộng

Không sinh toàn bộ ứng dụng trong một lần.

Mỗi phase phải có:

- Scope rõ ràng.
- Non-goals rõ ràng.
- Acceptance criteria.
- Definition of Done.
- Test tối thiểu.
- Tài liệu cập nhật.

Không chuyển phase khi phase hiện tại chưa được kiểm thử hoặc chưa xác định được giới hạn.

---

## 3. Non-goals của V1

V1 không nhằm xây dựng:

- Ứng dụng mobile native.
- Realtime collaborative editing.
- Video editor kéo-thả cấp độ Premiere/CapCut.
- 3D engine.
- Game engine.
- Live streaming.
- Hạ tầng cloud render phân tán.
- Hệ thống microservices.
- Kubernetes, Docker hoặc WSL.
- Prompt-to-video tự do không có Script/Schema kiểm soát.
- Sao chép nguyên trạng video tham chiếu của bên thứ ba.

---

## 4. Quy tắc khi có xung đột

Nếu task, code hiện có hoặc đề xuất mới mâu thuẫn với tài liệu này:

1. Không tự chọn cách giải quyết.
2. Nêu rõ nguyên tắc bị xung đột.
3. Nêu ảnh hưởng kỹ thuật.
4. Đề xuất tối thiểu một phương án.
5. Tạo ADR nếu thay đổi mang tính kiến trúc.

---

## 5. Definition of Done cấp dự án

Một module hoặc phase chỉ được xem là hoàn thành khi:

- Đúng phạm vi đã chốt.
- Không phá contract/schema hiện có.
- Có validation đầu vào.
- Có structured logging.
- Có mã lỗi hoặc error mapping phù hợp.
- Có tests tương ứng.
- Có hướng dẫn chạy/kiểm tra trên Windows.
- Có giới hạn được tài liệu hóa.
- Không để lộ secret.
- Không thêm dependency hoặc tính năng ngoài scope.

---

## 6. Câu hỏi kiểm tra trước khi merge

Trước khi merge bất kỳ thay đổi nào, trả lời:

1. Thay đổi này có giữ Renderer độc lập với AI Provider không?
2. UI có chứa business logic mới không?
3. Contract/schema/source of truth có bị thay đổi không?
4. Input đã được validate trước khi chạy pipeline chưa?
5. Có log và error code đủ để debug không?
6. Cache hợp lệ có còn được tái sử dụng không?
7. Có chạy được trên Windows mà không cần Docker/WSL không?
8. Có thể chạy từ Google Colab theo adapter hiện có không?
9. Có test và hướng dẫn kiểm tra không?
10. Người mới hoặc AI mới có thể hiểu thay đổi này từ docs không?

Nếu bất kỳ câu nào là “không”, thay đổi chưa sẵn sàng để merge.
