# 0.5.0 — Layout collections and examples

The maintainer approved this milestone plan after 0.4.0-rc.1 publication and authorized implementation after stable 0.4.0 shipped. [0.5.0](https://github.com/treisland/presentation-studio/milestone/6) covers layouts/examples; existing AI issues #15–#19 retain their milestone membership under 0.6.0, and MCP issues #20–#22 under 0.7.0. Work starts with #63 and the first Portfolio composition/starter/demo checkpoint. Broader collection expansion follows the manual review described below; publication still needs a separate release plan.

## First review slice

Choose **Project → New presentation → Portfolio starter** or **Portfolio finished example**, then use defaults or continue setup. Each use creates fresh project and slide identities through the existing save-before-switch guard. The finished one-slide library case study is fictional, makes no measured-impact claim, and embeds an original Apache-2.0 diagram. The library factory remains unchanged when a user customizes a copy. **Project settings → Recovery & reset → Reset entire presentation** confirms replacement, checkpoints changes and supports Undo.

**Add slide → Portfolio · Case study** adds the same composition to a project without changing its theme or swatches. Use the slide Layout control to preview a change. The mapping lists source text for each slot, image handling and unmatched material. Unmatched text/tables/commands stay on the slide; identified/free blocks and existing Grid cells retain identity. Extra material may overflow and must be shortened or rearranged before sharing. Locked slide contents block layout changes. Replacing prompts is explicitly confirmed; accepted changes preserve notes, IDs and media and create one Undo step plus a recovery checkpoint.

The image slot uses existing Media Grid controls for upload, Fit/Fill, independent crop and Media inspector descriptions/captions. Missing images remain editable drop targets. Retained tables preserve the complete subtree, including empty cells and rows, so column meaning stays unchanged; lists and command structures are also retained intact. Text never shrinks automatically: long-slot guidance and the readiness/layout overflow check flag excessive content and title/body overlap. All output remains 16:9 slides.

Automated checks cover layout mapping, lock rejection, Undo/checkpoints, fresh IDs, confirmed reset, long-content warnings and editable/playback ZIP reopening offline. These do not establish a real screen-reader, OBS or delivery-video pass. Complete [the checkpoint checklist](0.5.0-manual-test-plan.md) before broadening the collection.

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

Continue implementation through scoped issues and linked feature PRs under AGENTS.md/CONTRIBUTING.md. Run required checks/package validation, record real supported-environment/manual results, freeze scope before beta, and use a separate approved release plan. Neither the milestone nor feature PRs authorize publication.
