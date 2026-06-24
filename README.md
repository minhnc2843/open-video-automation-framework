# Open Video Automation Framework

> A specification-first, AI-agnostic framework for producing vertical short-form videos through a deterministic, debuggable pipeline.

## Mục tiêu

Dự án xây dựng một nền tảng tạo video cho Reels, TikTok và YouTube Shorts. Hệ thống không được thiết kế như một hộp đen “prompt → video”, mà là một pipeline có thể kiểm tra từng bước:

```text
JSON Script / API Assets
→ Validation
→ Timeline
→ Asset Resolution
→ HTML Scene Render
→ Chromium Capture
→ FFmpeg Encode
→ MP4 Output
```

Mục tiêu dài hạn là cho phép con người và AI agent cùng phát triển dự án mà không làm mất kiến thức kiến trúc, không khóa vào một AI provider, và không phải render lại những phần video không thay đổi.

## Ràng buộc V1

- Chỉ hỗ trợ video dọc `9:16` ở `1080x1920`.
- Video ngắn hơn `60 giây`.
- Có thể bật/tắt độc lập: voice, nhạc nền, subtitle.
- Ngôn ngữ đầu ra: tiếng Việt và tiếng Anh.
- Phát triển chính trên Windows + Laragon.
- Không dùng Docker, WSL2, Kubernetes hoặc yêu cầu ảo hóa.
- Google Colab là môi trường render nặng mặc định.
- Renderer mặc định: HTML/CSS/JavaScript + Playwright Chromium + FFmpeg.
- `JSON Script` là nguồn đầu vào chuẩn cho render pipeline.
- Không hardcode provider; mọi provider được gắn qua plugin contract.

## Hai chế độ sử dụng

### 1. Code Mode

Người dùng tự chuẩn bị kịch bản có cấu trúc JSON. Hệ thống validate và render, không dùng LLM để tự suy diễn prompt tự do.

```text
JSON Script → Validator → Timeline → Renderer → MP4
```

### 2. API Mode

Người dùng có thể cấu hình provider như Gemini, OpenAI, ElevenLabs hoặc provider khác. Provider chỉ tạo/phân tích asset; pipeline renderer vẫn độc lập.

```text
JSON Script + Provider/Reference Video
→ Asset Generation/Analysis
→ Timeline
→ Renderer
→ MP4
```

## Bắt đầu đọc ở đâu

Đọc theo thứ tự sau trước khi viết code hoặc giao task cho AI agent:

1. [`docs/START_HERE.md`](docs/START_HERE.md)
2. [`specs/PROJECT_MEMORY.md`](specs/PROJECT_MEMORY.md)
3. [`specs/PROJECT_PRINCIPLES.md`](specs/PROJECT_PRINCIPLES.md)
4. [`specs/MASTER_SPEC.md`](specs/MASTER_SPEC.md)
5. [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md)
6. [`specs/AI_RULES.md`](specs/AI_RULES.md)
7. [`specs/CODING_CONVENTIONS.md`](specs/CODING_CONVENTIONS.md)
8. [`docs/ROADMAP.md`](docs/ROADMAP.md)
9. Prompt phase hiện tại trong [`ai-prompts/`](ai-prompts/)

## Cấu trúc repository mục tiêu

```text
open-video-automation/
├── apps/
│   ├── web/                 # React + Vite
│   └── api/                 # Fastify + TypeScript
├── packages/
│   ├── contracts/
│   ├── core/
│   ├── validator/
│   ├── timeline/
│   ├── providers/
│   ├── renderer-html/
│   ├── asset-manager/
│   ├── logger/
│   └── config/
├── contracts/               # Public contracts, controlled changes only
├── schemas/                 # JSON Schema source of truth
├── specs/                   # Project constitution and standards
├── architecture/            # System/module architecture
├── docs/                    # Onboarding, roadmap, operational docs
├── adr/                     # Architecture Decision Records
├── ai-prompts/              # Versioned implementation prompts
├── examples/
├── tests/
├── scripts/
├── storage/
│   ├── projects/
│   ├── assets/
│   ├── cache/
│   ├── logs/
│   ├── temp/
│   └── output/
└── README.md
```

## Nguyên tắc cốt lõi

- Renderer không biết AI provider nào tạo asset.
- Provider không biết UI nào gọi nó.
- UI không chứa business logic.
- Validation luôn diễn ra trước render.
- Mọi lỗi có stage, error code, technical details và log JSON.
- Cache theo input fingerprint; scene không đổi không được render lại.
- Thay đổi public contract, JSON schema hoặc database schema phải có ADR/RFC.

## Trạng thái hiện tại

Repository hiện ở giai đoạn **Phase 00 — Foundation and repository governance**. Workspace skeleton và npm baseline được tạo trước; code business logic chỉ bắt đầu ở các phase sau khi contract/schema liên quan được chốt.

## Kiểm tra baseline trên Windows

Chạy trong PowerShell hoặc Command Prompt tại thư mục repository:

```powershell
npm install
npm run check
```

Kết quả mong đợi: `Workspace baseline check passed.`

## Đóng góp

Trước khi đóng góp, đọc `specs/AI_RULES.md`, `specs/MASTER_SPEC.md` và tài liệu phase tương ứng. Không gửi PR thay đổi contract hoặc schema mà không kèm ADR.

## License

Chưa quyết định. Không thêm license trước khi chọn chiến lược open-source và điều kiện tích hợp provider.
