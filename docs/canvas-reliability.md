# Canvas reliability — milestone 34

Implementation started from `v0.20.0-alpha.1` (`5de60e4`). On 2026-11-16 the
maintainer reported testing passed and authorized beta sign-off plus production
promotion after passing CI. Release/deployment authority and observed receipts
are tracked in [#305](https://github.com/treisland/presentation-studio/issues/305).

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
`test-results/canvas-profile-dense.json` identify hardware, browser, source and timing
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

| Gesture | Original 40-block baseline range | Early batching experiment range |
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

### Bring into view scope decision

Free geometry validators constrain supported objects to normalized slide bounds.
An offscreen object at manual zoom is a viewport issue: use Fit/pan or Layers. No
new Bring into view geometry mutation is added; it would duplicate navigation or
weaken validation. Rotated/clipped overflow remains inspectable through Layers.

Selection alignment uses the normalized object/group frame bounds, matching the
existing movement geometry. Rotated content keeps its rotation; this does not
reflow text or align individual glyphs.

## Candidate evidence

Runtime source `aa9d2c8` (source tree `775cdb8e76b4be336962069e6400a8510e1f0d05`)
includes final-wrapper batching and endpoint-first grip placement. Selected arrow
endpoints stay on their actual geometry; adjacent resize grips move out of the
way. `dbPanel` remains synchronous because its wrappers also update selection.

Against the untouched alpha, the new selected-endpoint/capture-loss test and
Layers-to-Inspector test fail and pass on this candidate. The template-text above
floating-media example passes on both: that specific click-through hypothesis
was not reproduced. Personal Library examples still require maintainer testing.

The expanded harness measures single, batch, group, media and endpoint gestures,
three repetitions with Snap off and on. Simple uses five blocks including an
arrow, a table, media, one group and no extra slides; dense uses 41 blocks including
an arrow, a table, media, one group and 40 extra slides (46 total). These differ
from the original 40-block comparison fixture above. Final measured medians:

| Gesture | Simple median (ms) | Dense median (ms) |
| --- | ---: | ---: |
| Single block | 94.0 | 253.0 |
| Batch | 96.6 | 524.7 |
| Group | 87.8 | 524.8 |
| Media | 118.2 | 571.8 |
| Arrow endpoint | 94.4 | 595.2 |

These instrumented runs overlapped local validation and are observations, not a
controlled benchmark. Simple ranges were 76–122 ms; dense ranges were 239–724 ms.
The 50 ms target remains unmet. Dense presentations can still feel delayed;
selected-slide rendering is a proposed follow-up, not an implemented claim.

Automated results, packaging and current CI status are recorded in PR #304.
Maintainer testing passed and release sign-off is recorded in #305. Individual
physical device/browser/screen-reader details were not supplied, so no expanded
certification is claimed. Stage PRs #300–#303 were superseded by #304; release
integration proceeds through the explicit beta preparation #306.
