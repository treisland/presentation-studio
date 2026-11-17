# Canvas reliability — milestone 34

Implementation starts from `v0.20.0-alpha.1` (`5de60e4`). This is development
work, pending maintainer testing; it does not authorize publication.

## Interaction inventory

The original planning inventory had 19 Library choices. The requested baseline
also includes four native charts. Recording and project-media management reuse
media objects; they do not introduce another geometry model.

| Library choice | Selection / edit | Move / resize / cancellation |
| --- | --- | --- |
| Text | Own frame, deliberate text editing; preserve active caret | Free block; single Undo; Escape restores |
| Rectangle | Own frame including transparent interior; text child | Free block |
| Circle | Own frame; clipped text child | Free block; grips outside clip |
| Quote | Whole widget; quotation and attribution fields | Free block; fields stay together |
| Metric card | Whole widget; value/label/support fields | Free block |
| Callout | Whole widget; icon/heading/body fields | Free block |
| Step number | Whole step; title/body text; badge via sequence controls | Free block; movement never renumbers |
| Arrow / Pointer | Whole block or explicit endpoint; label in Content | Block movement; separate endpoint gestures |
| Button | Whole block; editable label | Free block; links inactive in Edit |
| Outline button | Transparent interior belongs to block | Same as Button |
| Text link | Label and frame belong to block | Same as Button |
| Navigation arrow | Labeled navigation block, not endpoint arrow | Same as Button |
| Image / Video | Media figure; crop distinct from frame | Floating frame or explicit structured placement |
| Rectangle frame | Media owner, then crop editor | Floating media; retain mask/crop |
| Rounded frame | Same; rounded clip must not hide grips | Floating media |
| Circle frame | Same; circle clip distinct from frame | Floating media |
| Oval frame | Same; oval clip distinct from frame | Floating media |
| Table | Container selection; direct cell editing retained | Free container; content scrolls |
| Code / Commands | Container; Inspector edits, variants/copy retained | Free container; one code block per slide |
| Column chart | Whole native chart; Chart studio edits data | Free container; no internal SVG editing |
| Horizontal bars | Same | Free container |
| Line chart | Same | Free container |
| Donut chart | Same, including hole inside container | Free container |
| My components | Independent inserted objects with existing groups | Preserve saved group boundaries; fresh IDs |

Template text/cards need explicit free-position conversion; reset retains edited
content. Existing template tables/code use their specialized conversion. Media
grids retain cell/swap/detach controls. Groups move as units; member editing is
explicit. Hidden/locked content follows existing inspectability and protection
rules. Hover and overlap selection are editor-only and must not change exports.

## Baseline hypotheses and measurement

Source review found pointer-events disabled on original content under floating
media, text click/focus entering editing, and independent release implementations.
These are hypotheses until reproduced. Arrow endpoints use their last move sample
at release; blocks and groups restore transient styles before a synchronous commit.

Use `npm run profile:canvas` for the dense fixture. Results in ignored
`test-results/canvas-profile.json` identify hardware, browser, source and timing
limitations. Event-to-frame is an approximation of frame readiness, not physical
display latency. Timing wrappers are test-only; nested phase times overlap and
must not be summed. No production telemetry is introduced.

## Acceptance and manual handoff

Run each inventory row through selection, supported editing, movement, resize,
release, Escape, lock and Undo. Mark unsupported actions N/A rather than claiming
coverage. Include Fit/50%/100%, rotation, overlapping/transparent content,
structured/background/floating media, groups and mixed locked selections.

Installed-browser 200% zoom, keyboard-only authoring, screen-reader review,
personal saved compositions and maintainer usability acceptance remain manual.
Verify clean-profile editable restore, legacy import, recovery and offline
playback/booth without editor chrome. Existing issue #9 remains independent.

Affected guides: canvas manipulation, workbench, blocks/components, tables/groups,
annotations and media/navigation as applicable. Companion scene `editor overview`
needs review against the final development SHA; generated concept art is not an
authentic app capture. Companion deployment remains outside this work.

## Measured release baseline and bounded improvement

On Windows 10.0.26300, Ryzen 7 7700X, 31 GiB RAM, Node 26.13.0 and headless
Chromium 151.0.7922.34 at 1366×768, six samples each on the dense 40-block,
3×3-table, inline-media and 40-extra-slide fixture measured:

| Gesture | Baseline release-to-rAF range | After refresh batching range |
| --- | --- | --- |
| Single block | 1276–1311 ms | 192–259 ms |
| Batch | 1759–1819 ms | 182–232 ms |

These observations include instrumentation overhead and concurrent local work;
they are not a controlled SLA or physical display latency. Baseline validation
was about 1 ms, with 22/34 Inspector refresh calls per single/batch sample and
per-object clone/layout reads. Gesture completion now coalesces dependent view
refreshes and batches overflow measurement writes before reads. Validation,
recovery and atomic commit are not deferred. The aspirational 50 ms dense-case
budget is **not met**; further selected-slide rendering optimization requires
separate profiling rather than weakening transaction safety.
