# Original synthetic video fixtures

These silent, two-second 320x180 test patterns are generated from FFmpeg's testsrc2 filter, contain no recordings or third-party artwork, and are original project test assets under Apache License 2.0. FFmpeg is a generation tool, not an application or CI dependency. Encoders retain their own licensing; no encoder runtime is bundled.

Generation commands (run from repository root with FFmpeg available):

```
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=15 -t 2 -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -movflags +faststart tests/fixtures/media/pattern.mp4
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=15 -t 2 -an -c:v libvpx -b:v 150k -pix_fmt yuv420p tests/fixtures/media/pattern.webm
```

MP4 uses H.264 baseline; WebM uses VP8. Committed bytes keep tests independent of MediaRecorder timing and encoder availability. These fixtures establish coverage for these specific encodings, not every file using the same container. No audio/autoplay-with-sound guarantee is made.
