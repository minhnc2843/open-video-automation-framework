# Project Memory

## Purpose

Lưu các quyết định, ưu tiên và bối cảnh dài hạn mà AI agent hoặc contributor phải hiểu trước khi làm việc. File này không thay thế contract hoặc schema; nó giải thích **vì sao** chúng tồn tại.

## Product intent

Dự án không cạnh tranh trực tiếp với Veo, Runway hoặc Kling bằng một hộp đen text-to-video. Dự án là framework video automation có pipeline minh bạch, kiểm soát được và có thể thay thế từng thành phần.

Ưu tiên là: video ngắn, dọc, có thể render ổn định, có log chi tiết, có cache và có khả năng tiếp tục render sau lỗi.

## Environment reality

- Người phát triển chính sử dụng Windows và Laragon.
- Không thể dựa vào Docker, WSL2 hoặc công nghệ yêu cầu ảo hóa.
- Google Colab dùng để chạy render nặng và thử nghiệm GPU khi cần.
- Local development phải chạy được bằng Node.js, SQLite, Chrome/Chromium và FFmpeg.
- Hướng dẫn vận hành phải ghi rõ chạy lệnh ở đâu: Command Prompt/PowerShell trên Windows hoặc notebook cell trên Google Colab.

## Architectural decisions to preserve

1. JSON Script là nguồn đầu vào có cấu trúc. Không để Code Mode tự biến prompt tự do thành video bằng LLM.
2. Renderer đọc Timeline chuẩn hóa, không đọc trực tiếp prompt hoặc provider response.
3. AI provider là plugin, không nằm trong core business logic.
4. Renderer mặc định là HTML/CSS/JavaScript + Playwright Chromium + FFmpeg vì dễ debug, dễ preview và hợp với short-form motion graphics.
5. Mọi render cần validation trước khi chạy.
6. Mọi render phải có structured log, error code và context stage/scene.
7. Cache là requirement bắt buộc, không phải tối ưu sau này.
8. Mọi thay đổi contract/schema/database public phải có ADR hoặc proposal rõ ràng.
9. V1 ưu tiên một worker local đơn giản và SQLite; không triển khai hạ tầng distributed khi chưa có nhu cầu thực tế.
10. Video tham chiếu là style/technical reference có thể bật tắt theo thuộc tính; không phải cơ chế sao chép nội dung hoặc nhận diện cá nhân.

## Product constraints

- 9:16 only.
- 1080x1920 only trong V1.
- Duration < 60 seconds.
- Voice/music/subtitle độc lập, có thể tắt.
- Vietnamese và English là hai ngôn ngữ đầu tiên.
- Không hardcode provider hoặc chỉ hỗ trợ một provider.
- Không log API key hoặc secret.

## Non-goals V1

- Không xây editor video thời gian thực kiểu Premiere/CapCut.
- Không xây mobile app.
- Không xây livestream hoặc social scheduler.
- Không xây 3D/game engine.
- Không cam kết tạo lại hoàn hảo mọi chuyển động phức tạp của reference video.
- Không xây multi-tenant cloud SaaS hoàn chỉnh.
- Không triển khai Docker/Kubernetes/Redis/Kafka chỉ vì “chuẩn enterprise”.

## Development philosophy

Tài liệu, contract và schema là nguồn tri thức chính. Code là implementation có thể tái tạo từ tài liệu.

Một thay đổi tốt phải trả lời được:

- Nó giải quyết vấn đề thực tế nào?
- Nó có làm renderer/provider/UI phụ thuộc nhau hơn không?
- Nó có thể debug theo stage hay không?
- Nó có giữ tương thích ngược không?
- Nó có chạy trong Windows + Google Colab không?

## Success criteria

- Một AI agent mới đọc tài liệu trong 30 phút có thể biết phải đọc gì và không sửa sai kiến trúc.
- Người dùng sửa một scene không buộc render lại các scene trước đó nếu input không đổi.
- Lỗi render chỉ ra đúng stage, scene, error code và hướng khắc phục cơ bản.
- Thêm provider mới không cần sửa renderer.
- Thêm renderer mới không cần sửa core pipeline contract.
- Colab có thể render lại job từ cache sau khi session gián đoạn, trong phạm vi asset/cache đã được đồng bộ.
