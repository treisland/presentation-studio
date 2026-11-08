# 0.5.0 — Layout collections and examples

The maintainer approved this milestone plan after 0.4.0-rc.1 publication. [0.5.0](https://github.com/treisland/presentation-studio/milestone/6) now covers layouts/examples; existing AI issues #15–#19 retain their milestone membership under 0.6.0, and MCP issues #20–#22 under 0.7.0. Scope below is planning only: these issues are not agent-ready and do not authorize implementation or publication by themselves.

## Scope and delivery order

1. Build shared composition/slot metadata, theme inheritance, content mapping, reading order and overflow handling.
2. Deliver one complete Portfolio composition plus starter/finished-demo pair for maintainer manual review. Use this checkpoint to validate the abstraction and editing workflow before multiplying templates.
3. Expand to 3–5 reusable compositions per collection: Portfolio/Case study, Comic, Editorial with Newspaper/Blog variants, Newsletter and Flyer.
4. Provide paired starters and finished demos for Portfolio, Comic and Editorial, plus lightweight Newsletter/Flyer starters.
5. Add the example gallery and short optional replayable walkthroughs, then complete validation/manual evidence and separate release preparation.

| Work | Issue | Key acceptance |
| --- | --- | --- |
| Shared foundations | [#63](https://github.com/treisland/presentation-studio/issues/63) | Layout/theme separation, safe previewed content mapping, retained unused material, reading order and overflow |
| Portfolio / Case study | [#64](https://github.com/treisland/presentation-studio/issues/64) | Problem, process, results, gallery and credits; first end-to-end review |
| Comic | [#65](https://github.com/treisland/presentation-studio/issues/65) | Panel sequences, editable captions/bubbles, independent crops and logical reading order |
| Editorial | [#66](https://github.com/treisland/presentation-studio/issues/66) | Newspaper/Blog treatments, headlines, columns, pull quotes, captions and long-content handling |
| Newsletter | [#67](https://github.com/treisland/presentation-studio/issues/67) | Lead/update/curation/closing compositions and lightweight starter; slide output clearly labeled |
| Flyer | [#68](https://github.com/treisland/presentation-studio/issues/68) | Headline/hero/details/action compositions and lightweight starter using current slide format |
| Starters and finished demos | [#69](https://github.com/treisland/presentation-studio/issues/69) | Three core pairs, original bundled offline assets, fresh project identity and confirmed reset |
| Start from an example gallery | [#70](https://github.com/treisland/presentation-studio/issues/70) | Preview/Use actions beside Blank/Import, purpose/image filters, clear format badges, safe switching |
| Optional walkthroughs | [#71](https://github.com/treisland/presentation-studio/issues/71) | Skip/close/replay, focus/reduced-motion support, editor-only cues excluded from exports |
| Validation and release evidence | [#72](https://github.com/treisland/presentation-studio/issues/72) | Every collection/starter plus core demos, legacy/portable recovery, manual evidence and protected release gates |

## Product rules

Layouts define structure; project themes/swatches define appearance. Text remains editable, each image slot supports sensible Fit/Fill/crop and descriptions, and reading order is deliberate. Long headings, missing images and additional paragraphs need explicit overflow/empty-slot handling. Never silently discard content or shrink text below useful sizes.

Preview layout changes and show how content maps. Retain unused content for recovery, respect locks, preserve IDs and make accepted changes one Undo step. Use this starter creates a fresh project identity without replacing another draft; library examples remain immutable and Reset example confirms replacement of the user's example copy. Keep save-before-switch and complete backup behavior.

Starters contain editable prompts; finished demos contain complete realistic neutral content; optional walkthroughs teach interface actions outside exported content. Bundle original/licensed assets with notices, meaningful image descriptions and readable contrast. Preview and Use must remain keyboard/screen-reader accessible and work offline.

## Boundaries and future discovery

All initial collections use the current 16:9 slide canvas. Newsletter-style slides do not imply email-client HTML or sending, Flyer-style slides do not imply print-ready sizes/bleed/CMYK/PDF, and Editorial layouts do not imply scrolling pages or hosted publishing. Accounts/collaboration and AI/MCP are separate scopes.

[Unscheduled discovery #73](https://github.com/treisland/presentation-studio/issues/73) assesses portrait, square, print and scrolling formats, reflow/pagination, compatibility and suitable exports. It has no milestone or release commitment. Only add orientation filters when multiple actual formats exist.

Implementation requires scoped readiness decisions and linked feature PRs under AGENTS.md/CONTRIBUTING.md. Run required checks/package validation, record real supported-environment/manual results, freeze scope before beta, and use a separate approved release plan. Neither this document nor the milestone renumbering authorizes publication.
