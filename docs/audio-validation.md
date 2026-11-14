# Audio development validation

This is development evidence, not release or manual sign-off. The validated candidate below includes the authoring-status, audience-timeout, public-export privacy and booth/video ownership fixes. Earlier baseline evidence is retained separately. Published v0.16.0 remains unchanged. The maintainer approved guarded native v5 for audio-bearing projects on 2026-11-13; legacy/audio-free formats remain supported.

## Validated runtime candidate

- Runtime: 3b7ed2210e976525b40ddee563a98f698e9561bd; embedded development channel, dirty=false, package version 0.16.0. No new release version is chosen.
- Full npm run check and npm run package passed at that exact clean runtime revision, with git diff --check passing. Twelve authoring/playback browser checks and the controller suite passed.
- Six additional acceptance cases pass against this runtime: overall/music continuity and session defaults, corrupt/missing/unsafe ZIP refusal, exact-byte persistent-profile recovery, video-ended/Media Focus precedence, booth timer precedence, and normal/booth shared-origin ownership handoff. The acceptance PR's full check/package and platform CI record its own test-only revision.
- Environment: Windows 10.0.26300 x64, Node v26.13.0, Playwright Chromium 151.0.7922.34; headless file/loopback-origin tests.
- Candidate is an ignored local review bundle, identified by receipt.json; it is not a published release.

| Candidate output | SHA256 |
| --- | --- |
| presentation-studio-audio-development.html | 8cf6242f128e81f5fe4fbf5955f6cb45752141c9fec86f78df421af09bb7c239 |
| presentation-studio-audio-blank.html | 1f575aa72660f28354483d3d7fcbcae77e5db94222ab3281ae334552e544190f |
| presentation-studio-audio-development-3b7ed22.zip | 169a86c156df1b062b7138c9279a77f0f2ee6eae540e19845b0919b4064a5aa7 |

Independent manual sound, real browser/codec/activation, displays, keyboard/screen-reader, themes/laptop layout and offline acceptance remain **pending**. Use [the manual checklist](audio-acceptance.md) and record the exact candidate/environment before claiming completion.

## Superseded development baseline

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

## Audio and Background UX refinement (#261 / PR #262)

Runtime and regression source: `8b502ecdcb6cfd7be687d06520a7c13959c9c5b1`, based on protected dev `51cca37`. Package version remains 0.16.0 and output is a development candidate, not a published beta. Guide-only changes accompany this record.

- Full `npm run check`: passed, 488 tests (48 unit/build, 158 browser, 171 component, 23 manipulation, 23 Inspector, 46 viewer and 19 audio).
- `npm run package`: passed, including rebuilt normal/blank standalone HTML and portable archive.
- `git diff --check`: passed.
- Focused audio/background baseline: 44/44 passed. The final audio/numeric regression run passed 13/13, covering audible preview state, paused keyboard seeking without authored mutation, independent track Stop controls, paired volume/Undo, preview cleanup on settings navigation and one Background parent.
- GitHub validation for the runtime commit: [Windows/Linux, container and branch-policy checks passed](https://github.com/treisland/presentation-studio/actions/runs/43566119788).
- Initial full validation exposed a numeric-controls test accessing Effects without opening its new Background parent. The test now follows the disclosed navigation and retains its original staging/reset/Undo assertions; the full suite then passed.
- Local authentic light/dark captures were reviewed at 1440 × 1080 with the original portfolio fixture, via ignored `test-results/review-audio.mjs`; screenshot outputs remain ignored local review artifacts. No POC image is represented as an authentic app capture or committed public screenshot.

Affected guides are Audio, Inspector navigation, Custom backgrounds and Background effects. Companion editor-overview imagery is affected and its public refresh/human approval remains pending. Gallery, Media Focus, AI preview and finished-playback scene behavior is unchanged. No companion deployment or release plan was changed.

Physical sound, real supported-browser codec/autoplay behavior, laptop/narrow/touch layouts, screen-reader review, dual displays and manual offline delivery remain pending under the existing acceptance checklist. Automatic ducking, fades/trimming and waveform editing remain proposals; this refinement preserves the current format and playback contract.
