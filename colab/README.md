# Huong Dan Google Colab

README nay huong dan cai dat Open Video Automation Framework tren Google Colab va cach dung Colab nhu moi truong render nang tam thoi.

Colab khong phai la backend production luon bat va khong phai source of truth. Du lieu ben vung van nam trong `storage/` cua project hoac Google Drive: SQLite metadata, assets, cache, logs va output. Truoc khi tat runtime Colab, luon dong bo `logs/`, `output/` va cache can giu lai ve Drive.

## Yeu Cau

- Google Colab notebook.
- Repository Git cua du an.
- Google Drive neu muon giu state sau khi Colab reset.
- Node.js `>=22`, npm `>=10`.
- `ffmpeg`, `ffprobe`, va Chromium cua Playwright. Setup se thu theo thu tu: `CHROMIUM_PATH`, Playwright-managed Chromium, `chromium`, `google-chrome`, `google-chrome-stable`, `chrome`, `chromium-browser`.

## Cai Dat Nhanh Tren Colab

Mo mot notebook moi tren Google Colab, sau do chay lan luot cac cell ben duoi.

### 1. Mount Google Drive

```python
from google.colab import drive
drive.mount("/content/drive")
```

Thu muc Drive de luu state ben vung:

```python
OVAF_DRIVE_ROOT = "/content/drive/MyDrive/ovaf"
OVAF_REPO_ROOT = "/content/open-video-automation-framework"
OVAF_STORAGE_ROOT = "/content/ovaf-storage"
```

### 2. Clone Repository

```python
REPO_URL = "https://github.com/minhnc2843/open-video-automation-framework.git"
!git clone {REPO_URL} /content/open-video-automation-framework
%cd /content/open-video-automation-framework
```

Neu repository da ton tai trong runtime:

```python
%cd /content/open-video-automation-framework
!git pull
```

### 3. Cai Node.js 22 Neu Can

Kiem tra version truoc:

```python
!node --version
!npm --version
```

Neu Node nho hon `22`, cai Node.js 22:

```python
!curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
!sudo -E bash /tmp/nodesource_setup.sh
!sudo apt-get install -y nodejs
!node --version
!npm --version
```

### 4. Cai Cong Cu Render

```python
!sudo apt-get update
!sudo apt-get install -y ffmpeg
```

Khuyen dung Playwright-managed Chromium tren Colab de tranh `chromium-browser` snap launcher cua Ubuntu:

```python
!npx playwright install-deps chromium
!npx playwright install chromium
```

Mac dinh Playwright luu browser trong cache cua runtime Colab. Neu muon cache browser tren Drive de tai lai nhanh hon, dat `PLAYWRIGHT_BROWSERS_PATH` truoc khi install:

```python
import os

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/content/drive/MyDrive/ovaf/ms-playwright"
!npx playwright install-deps chromium
!npx playwright install chromium
```

`setup_colab.py` se tu resolve Chromium executable tu Playwright hoac `PLAYWRIGHT_BROWSERS_PATH`. Chi dat `CHROMIUM_PATH` khi ban muon tro thang toi mot executable rieng:

```python
import os

os.environ["CHROMIUM_PATH"] = "/absolute/path/to/chrome"
```

### 5. Cai Dependencies Cua Du An

```python
%cd /content/open-video-automation-framework
!npm install
```

### 6. Build Va Kiem Tra Colab Runtime

```python
!npm run build --workspace @ovaf/colab
!python colab/setup_colab.py --storage-root /content/ovaf-storage --drive-root /content/drive/MyDrive/ovaf
```

Ket qua mong doi la JSON report co `"ok": true`. Script nay tao layout:

```text
/content/ovaf-storage/
  projects/
  assets/
  cache/
  logs/
  temp/
  output/
```

## Dong Bo Du Lieu Voi Drive

Colab runtime co the mat du lieu khi reset. Nen dung Drive lam noi luu ben vung.

Tao layout Drive lan dau:

```python
!mkdir -p /content/drive/MyDrive/ovaf/storage/projects
!mkdir -p /content/drive/MyDrive/ovaf/storage/assets
!mkdir -p /content/drive/MyDrive/ovaf/storage/cache
!mkdir -p /content/drive/MyDrive/ovaf/storage/logs
!mkdir -p /content/drive/MyDrive/ovaf/storage/output
```

Dong bo tu Drive vao Colab truoc khi chay job:

```python
!rsync -a /content/drive/MyDrive/ovaf/storage/ /content/ovaf-storage/
```

Dong bo nguoc ve Drive sau khi chay xong:

```python
!rsync -a /content/ovaf-storage/logs/ /content/drive/MyDrive/ovaf/storage/logs/
!rsync -a /content/ovaf-storage/output/ /content/drive/MyDrive/ovaf/storage/output/
!rsync -a /content/ovaf-storage/cache/ /content/drive/MyDrive/ovaf/storage/cache/
```

## Kiem Tra Cai Dat

Chay smoke test va benchmark khong can render MP4 that:

```python
!npm run test:integration
!npm run benchmark:render
```

Chay full acceptance:

```python
!npm run acceptance
```

Acceptance gom workspace check, TypeScript build, unit/integration tests, render benchmark dry-run va `npm audit`.

## Render MP4 Example Tren Colab

Sau khi `setup_colab.py` bao `"ok": true`, render fixture example:

```python
%cd /content/open-video-automation-framework
!OVAF_STORAGE_ROOT=/content/ovaf-storage npm run render -- examples/basic-vertical-short.json
```

Output mong doi:

```text
/content/ovaf-storage/output/basic-vertical-short.mp4
```

Kiem tra nhanh bang FFprobe:

```python
!ffprobe -v error -show_format -show_streams -print_format json /content/ovaf-storage/output/basic-vertical-short.mp4
```

Dong bo output ve Drive:

```python
!rsync -a /content/ovaf-storage/output/ /content/drive/MyDrive/ovaf/storage/output/
!rsync -a /content/ovaf-storage/logs/ /content/drive/MyDrive/ovaf/storage/logs/
```

## Cach Su Dung Trong Workflow

### 1. Chuan Bi JSON Script

Ban co the bat dau tu fixture:

```python
!cp examples/basic-vertical-short.json /content/ovaf-storage/projects/basic-vertical-short.json
```

File JSON Script that cua project nen duoc luu ben Drive hoac sync vao `/content/ovaf-storage/projects/`.

### 2. Chuan Bi Assets

Dat file dau vao vao:

```text
/content/ovaf-storage/assets/
```

Vi du: voice wav, music wav, image/video reference, hoac asset da generate tu provider. Neu asset can dung lai, sync ve Drive sau khi chay xong.

### 3. Chay Pipeline / Render Job

Trang thai hien tai cua repo co cac primitive cho validation, timeline, HTML scene renderer, FFmpeg command builder, job worker skeleton va Colab resume planning. Colab README nay thiet lap moi truong va state layout de chay render nang, nhung chua tao mot lenh CLI duy nhat kieu `render project.json`.

Trong baseline hien co, cac lenh co san de xac minh pipeline la:

```python
!npm run test:integration
!npm run benchmark:render
```

Khi project co CLI/worker orchestration that, hay chay lenh render trong repo root va tro storage ve:

```text
/content/ovaf-storage
```

Sau khi job hoan tat, sync ve Drive:

```python
!rsync -a /content/ovaf-storage/logs/ /content/drive/MyDrive/ovaf/storage/logs/
!rsync -a /content/ovaf-storage/output/ /content/drive/MyDrive/ovaf/storage/output/
!rsync -a /content/ovaf-storage/cache/ /content/drive/MyDrive/ovaf/storage/cache/
```

### 4. Resume Job Sau Khi Colab Reset

1. Mount Drive.
2. Clone/pull repository.
3. Cai dependencies neu runtime moi.
4. Sync `storage/` tu Drive vao `/content/ovaf-storage`.
5. Chay `setup_colab.py` de kiem tra runtime.
6. Dung `@ovaf/colab` sync manifest va resume plan de xac dinh job co the `start`, `resume`, `complete` hay bi `blocked`.

Sync manifest mac dinh nen co:

```json
{
  "version": "1.0",
  "id": "sync-job-1",
  "direction": "to_colab",
  "sourceRoot": "storage",
  "targetRoot": "/content/ovaf-storage",
  "files": [
    { "kind": "database", "path": "projects/project-store.sqlite", "required": true },
    { "kind": "asset", "path": "assets/", "required": true },
    { "kind": "cache", "path": "cache/", "required": false },
    { "kind": "log", "path": "logs/", "required": false },
    { "kind": "output", "path": "output/", "required": false }
  ]
}
```

Quy tac quan trong:

- `path` trong manifest phai la relative path, khong bat dau bang `/`, khong chua `..`.
- File `required: true` phai co mat truoc khi resume.
- Neu co checksum thi checksum phai la SHA-256 hex digest.
- Colab khong giu state lau dai; Drive hoac local storage moi la noi luu ben vung.

## Lenh Hay Dung

```python
# Cai dependencies
!npm install

# Kiem tra Colab package
!npm run build --workspace @ovaf/colab

# Tao storage layout va environment report
!python colab/setup_colab.py --storage-root /content/ovaf-storage --drive-root /content/drive/MyDrive/ovaf

# Test smoke path
!npm run test:integration

# Benchmark render dry-run
!npm run benchmark:render

# Full acceptance
!npm run acceptance
```

## Xu Ly Loi Thuong Gap

### `node version is too old`

Cai Node.js 22 theo cell o muc "Cai Node.js 22 Neu Can", sau do chay lai `npm install`.

### `chromium command was not found` hoac setup bao snap launcher

Khong cai `chromium-browser` bang apt tren Colab, vi binary `/usr/bin/chromium-browser` co the chi la snap launcher va khong chay duoc. Dung Playwright-managed Chromium:

```python
!npx playwright install-deps chromium
!npx playwright install chromium
```

Neu muon luu browser cache tren Drive:

```python
import os

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/content/drive/MyDrive/ovaf/ms-playwright"
!npx playwright install-deps chromium
!npx playwright install chromium
```

Sau do chay lai `setup_colab.py`; script se tu detect Playwright-managed Chromium.

### `google_drive_mount does not exist`

Chay lai:

```python
from google.colab import drive
drive.mount("/content/drive")
```

Sau do kiem tra thu muc `/content/drive/MyDrive/ovaf`.

### Mat output sau khi runtime reset

Neu chua sync ve Drive thi output trong `/content/ovaf-storage/output/` co the mat. Luon chay cac lenh `rsync` ve Drive truoc khi disconnect runtime.

## Tai Lieu Lien Quan

- `docs/COLAB_OPERATIONS.md`: contract van hanh Colab, sync manifest va resume flow.
- `packages/colab/README.md`: primitives cua package `@ovaf/colab`.
- `examples/basic-vertical-short.json`: fixture JSON Script dung trong smoke test.
- `tests/integration/pipeline-smoke.test.ts`: acceptance path tham chieu.
