# Canvas interaction baseline — milestone 0.14.0

Issue #177 measures behavior before choosing optimizations. Run `npm ci` and `npm run profile:canvas` in an ordinary development checkout. The optional Playwright harness writes `test-results/canvas-profile.json`; it is not a CI timing gate or a replacement for installed-browser/manual review.

## Fixture and environment

Measured checkout: `a41c45eafecbb3b6a075c83eb775c01f6fa05b09`; its product runtime is unchanged from `3b31379b36a9ef48aa170a71709cfdaeb8774161` (0.13.1-beta.1), with source-tree identity `bbc4f592afd8980b78e534063e7d90a9e6319813`. Windows 10.0.26300, AMD Ryzen 7 7700X, 16 logical processors, 31 GiB reported RAM, Node 26.13.0, headless Chromium 151.0.7922.34, 1366 × 768 viewport. This is one development machine, not a claimed supported-device minimum.

The original neutral fixture contains a 46-slide deck, with 40 mixed text/shape/callout blocks, a 3 × 3 table and one inline SVG on the measured slide. Three repetitions cover single and temporary two-item movement, each with snapping off/on. Each drag sends 24 real pointer movements of (2,1) CSS pixels, with an 8 ms requested delay. Undo restores the fixture after every move. No customer files, services, new dependencies or saved-format changes are involved. Raw observations are in [canvas-interaction-baseline.json](canvas-interaction-baseline.json).

## Observations

| Gesture | Snap | Geometry reads during drag | Guide nodes added | Frame interval p95 | Commit → two frames |
| --- | --- | --- | --- | --- | --- |
| Single | Off | 1 | 0 | 16.8 ms | 977–995 ms |
| Single | On | 1,009 | 47 | 16.7–16.8 ms | 988–1,004 ms |
| Two items | Off | 1 | 0 | 16.7–16.8 ms | 1,393–1,418 ms |
| Two items | On | 1 | 0 | 16.7 ms | 1,399–1,441 ms |

Single-move snapping adds roughly 42 geometry reads per pointer event for this fixture. Batch snapping produces no guides: the baseline batch path does not call the shared snap routine. That is a correctness gap owned by #173, not evidence of a faster equivalent algorithm.

The post-gesture phase dominates the measured delay. Its long tasks span 960–980 ms for single moves and 1,366–1,407 ms for batch moves. It performs 22 geometry reads in each run; batch commits add 16 selection overlay/row nodes. No thumbnail *button additions* were observed. That counter does not prove thumbnail rendering or descendants are cost-free. The measurement separates drag from commit, but does not attribute the whole commit delay to Inspector or thumbnails: browser CPU tracing around model copying, persistence, preview and selection refresh is the next attribution step.

Pointer event timestamp → next rAF p95 was 13.9–18.8 ms. Timing starts at the event's timestamp, before window capture handlers, so it includes gesture/snapping processing. A separate 25 ms capture-handler calibration measured 26.3 ms and verifies that the metric includes handler work. This supersedes the earlier incorrectly placed timer, which excluded the gesture handlers. Every sampled drag must change content and Undo must restore its fixture before the next sample.

A rAF callback is frame readiness, not proof of displayed pixels or physical input latency. The commit interval includes driver round-trip and two rAFs, so compare equivalent runs on the same machine. Warmup, background work, headless scheduling, display scaling and lower-end hardware can change results. Do not present these numbers as a human usability or screen-reader/OBS test.

## Proposed budgets and focused follow-ups

- For equivalent 60 Hz fixtures, investigate frame-interval p95 above 33.4 ms (two frames); separately monitor long tasks above 50 ms. The baseline drag stays near one frame, so a general frame-loop rewrite is not justified by these results.
- Investigate post-gesture commit above 250 ms on this machine. This proposed responsiveness target is deliberately below the observed 1.0–1.4 seconds; it is a follow-up target, not an achieved claim or an accepted cross-device SLA. Confirm target hardware and repeat with browser tracing before turning it into a CI budget.
- Prototype targeted commit refreshes only after attributing the long task. Compare model transaction/persistence and preview, Inspector, selection and thumbnail sub-phases independently. Preserve pending field ownership, stable identity, locks, stale revisions, one Undo step and final pointer flush. A quick-looking partial repaint must not leave another view stale.
- If snap cost grows with denser fixtures, consider one snap-target geometry snapshot per gesture. Exclude all moving members, retain normalized slide coordinates and the screen-pixel tolerance, and invalidate on selection/slide/revision, layout/viewport/zoom, hidden/locked state and gesture end. Never reuse stale geometry across gestures. Validate Alt/Shift transitions, clamping, cancellation and the final pointer position before adoption.
- Persistent guide nodes or frame batching are optional prototypes, not implemented optimization claims. Frame batching must flush the final pointer before commit and cancel queued work on Escape, pointer cancellation, capture loss, slide change and teardown. Guide cleanup must work with Alt bypass and axis locking.

The milestone's gesture, handle and Inspector corrections should rerun this fixture and the correctness suites against equivalent builds. Manual keyboard/screen-reader review, laptop/200% browser zoom and real target-device acceptance remain separate gates. Issue #9 remains an independent accessibility audit.
