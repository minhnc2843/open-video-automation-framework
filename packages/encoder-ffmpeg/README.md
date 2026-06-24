# FFmpeg Encoder Package

FFmpeg encoder adapter for Phase 08.

Current responsibilities:

- build FFmpeg commands for image sequence or video file input;
- add audio switches for no-audio, one-audio-track and multi-track `amix`;
- write concat demuxer manifests for scene videos;
- run external process commands through an injectable runner boundary;
- validate MP4 metadata from FFprobe JSON.

Out of scope:

- installing FFmpeg or Chromium;
- rendering frames;
- audio generation;
- UI/API endpoints.

Real execution requires `ffmpeg` and `ffprobe` on PATH or configured executable paths. Unit tests inject fake runners and do not require FFmpeg installed.
