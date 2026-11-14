# Audio development validation

This is development evidence, not release or manual sign-off. Published v0.16.0 remains unchanged. The maintainer approved guarded native v5 for audio-bearing projects on 2026-11-13; legacy/audio-free formats remain supported.

## Completed baseline

- Runtime revision: 7bff824f7ea945b73ce2b82084cacc1e2a4c10b6; embedded channel development, dirty=false, package version 0.16.0 (no new release version selected).
- Environment: Windows 10.0.26300 x64; Node v26.13.0; Playwright Chromium 151.0.7922.34, headless file-URL checks. This is not Chrome/Edge/Firefox manual sign-off.
- Full npm run check and npm run package passed at that clean revision. Unit controller cases and ten focused authoring/playback browser checks passed, including stale/padding guards, invalid files, exact-byte clean-profile restore, audience-only playback/reopen, blocked retry, and actual ordinary/booth ZIP offline media timing.
- The booth isolation test remains enabled. A variable name that accidentally matched its authoring-source sentinel was renamed; no check was disabled. Fresh normal playback uses validated sibling asset paths when in-memory blobs are absent.

| Local output | SHA256 |
| --- | --- |
| dist/presentation-studio.html | eab6b0c2574b325fe2d675583a267590e9edf32d34920e5a575dce6da13b3131 |
| dist/presentation-studio-blank.html | cbd59f44a65bf9347712f5c7dff7d83f6d2f8cbf7d2bf9e1a6b0bf471b80a865 |
| release/presentation-studio-v0.16.0.zip | 0866fc885c5f67fc52d170ecbe3b743dc188b679dc42a1d58eb60054da4cd21e |

These are ignored local build outputs from the named development revision, not published assets and not replacements for any immutable v0.16.0 release.

## Additional acceptance coverage (#247)

Focused tests pass for actual overall narration/music continuity during rapid navigation, session gain/mute that preserves authored defaults, missing/same-size corrupt/unsafe audio archives without active-state replacement, and exact-byte recovery after closing/reopening a persistent browser profile. Full integrated validation of the acceptance-test commit is recorded in its PR before readiness.

## Still pending

Actual audible output/levels, real browser activation restrictions and codec coverage, supported Chrome/Edge/Firefox versions, real dual displays/windows, keyboard/screen-reader review, laptop/themes/forced-colors and independent offline use remain unperformed here. Use [the concrete manual checklist](audio-acceptance.md); record the tested artifact hashes and exact environment. CI cannot complete these rows. Keep #247 and milestone acceptance open until their required evidence is recorded. No release plan, publication, public companion deployment or #241 patch is authorized by this record.
