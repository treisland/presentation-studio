# Media compatibility evidence

Results describe exact tested encodings and workflows, not a guarantee for every MP4/WebM file or browser. Use muted video for automated playback. Test your actual delivery files and OBS setup before presenting.

The maintainer subsequently reported the alpha.2 OBS recording/actual delivery-video checklist passing without defects. Exact versions, capture method and opening mode were not supplied; see [the consolidated release evidence](releases/0.2.0-evidence.md). That report does not identify OBS Browser Source specifically, so the source-specific matrix entry remains pending.

## Fixture coverage

The original silent patterns in tests/fixtures/media are H.264 baseline/yuv420p in MP4 and VP8/yuv420p in WebM. Each is two seconds, 320x180, 15 fps. Provenance and regeneration commands are beside the fixtures. FFmpeg is not needed to run the committed tests.

The regression imports each media file, plays it, expands/returns focus without replacing its element or losing the user pause/position, compares exported media bytes, reopens both editable and playback ZIPs offline, and imports the editable ZIP in a clean profile. Clean profiles avoid cross-tab browser draft conflicts. Diagnostic output records OS, browser version, fixture and playback mode; readiness failures include codec capability, network/readiness state and media errors.

## Matrix — 2026-11-07

| Environment | Mode and media | Evidence |
| --- | --- | --- |
| Windows x64 / matching Playwright Chromium 151.0.7922.34 | headless; file URLs; muted H.264 MP4 and VP8 WebM | Both fixture round trips passed locally; browser version is emitted by each test |
| Windows x64 / installed Chrome 157.0.8103.38 | headless; file URLs; muted H.264 MP4 and VP8 WebM | Both fixture round trips passed locally using CHROMIUM_EXECUTABLE_PATH |
| Linux / matching Playwright Chromium | file URLs; same fixtures | CI configured; new fixture-run evidence pending first PR CI |
| OBS Browser Source | real local-file presentation, looping and focus | Manual verification pending; no support claim from browser CI |
| Other browsers, audio playback, localhost hosting | Not covered by this fixture run | Unverified |

Run `node --test tests/media-roundtrip.test.mjs` for matching Chromium. To use installed Chrome, set CHROMIUM_EXECUTABLE_PATH to its executable first. Run the full `npm run check` before merging. A browser/container capability hint cannot prove the encoded codec will decode.

## Remaining manual gates

For OBS, record OS, OBS version, embedded browser version if available, rendering mode, fixture codec/container, mute/autoplay settings and results. Extract the complete playback ZIP, open index.html as a 1920x1080 local Browser Source, verify advancing slides, video playback/looping and focus/return where interactive. Test an actual intended delivery video too. Keep untested entries pending and link results to issue #7 / release-readiness issue #30 before claiming support.
