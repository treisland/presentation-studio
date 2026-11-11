# Roadmap

## Current delivery plan

**0.10.0 — Distribution and deployment — #130:** version/About UI and import compatibility policy; hardened static Docker/GHCR delivery; Actions-based stable/beta Pages hosting for pres-studio.com (Namecheap DNS), verified release promotion and isolated review deployment. npm publishing remains deferred. Manual acceptance follows deployment; existing release gates remain unchanged. See [deployment and testing](deployment.md).

Included follow-up **#132** in PR #131: Docker-only fresh-checkout Compose startup, a dedicated source build stage with development identity, an explicit verified-prebuilt release target and independent CI smoke/security coverage for both paths.

Stable 0.7.0 remains published. The maintainer accepted the integrated 0.8.0 workbench (#124 / PR #125) and 0.9.0 Inspector/Layers work (#126 / PR #127), approved protected merges and explicitly authorized the combined 0.9.0-beta.1 prerelease (#128). Manual beta gates are confirmed in the [validation record](releases/0.9.0-beta.1-validation.md). Publication still requires the merged release plan, exact-main checks, immutable tag workflow and artifact verification. No separate 0.8.0 release is backfilled. Optional MCP discovery and native filesystem work remain deferred.

- **Completed — 0.4.0 stable delivery:** styling/swatches/picker, blank/clear, snapping, Layers and reviewed removal fixes. See [stable notes](releases/0.4.0.md) and [feature guide](styling-and-precision.md).
- **Completed — 0.5.0 layout collections and examples:** five collections, starters/demos, gallery and optional walkthroughs passed review and stable publication. See [the validation record](0.5.0-validation.md) and [stable notes](releases/0.5.0.md).
- **Completed — 0.3.0 canvas enhancements:** responsive workspace, shared editing API, additive media, draggable blocks, Media Grid, accessible Media Focus and Inspector polish. Detailed environment follow-ups #7/#9 remain visible.
- **Deferred:** camera overlays, template publishing, accounts and collaboration until the core workflow is dependable.

- **0.6.0 — Blocks, Widgets and Reusable Components:** contextual formatting, unified Add/Library, static widgets, one-level grouping and independent portable component presets. See [scope and acceptance](blocks-components.md). Manual beta review remains pending.
- **0.6.0 Library usability follow-up:** compact dialog typography, Blocks/Widgets/My components tabs, searchable consistent visual cards including Media, separate Save selection flow, per-component management menus and library import/export/recovery under Manage library. Keep navigation visible while results scroll and support small screens and keyboard access.
- **0.6.0 Data & Code — #104:** Library insertion of Tables and Code/Commands; shared snippet default, optional language/environment labels, optional named variants/default/OS preference, empty-variant suppression and independent block hiding. Preserve legacy pairs and display/copy-only offline playback. Fresh manual review required.
- **0.6.0 positionable Data & Code:** free-block Table/Code containers with movement, resize, snapping, locks and Undo; real miniature Library previews, readable setup controls and responsive two-column cards. Retain table/copy interactions and offline exports; manual review remains required.
- **0.6.0 visibility — #106:** unified element hide/show, editor-only hidden-element view, group visibility that preserves child flags, inherited presentation defaults/per-slide overrides for header/footer/logo/slide number/decorations, layout-preserving concealment and filtered playback/booth exports. Manual review required.
- **0.6.0 Inspector — #108:** selection-aware Content/Style/Arrange, object and nested-field identity, shared/mixed selections, explicit member/slide navigation and opt-in Inspector text editing. Preserve pending edits, locks, focus, Undo and legacy authoring. Fresh manual review required; publication remains disabled.
- **0.6.0 template-heading correction — #110:** delete visible primary headings while retaining slide identity/name; duplicate as independent ordinary text; target the actual selected heading in Inspector summaries and alternative editing. Preserve locks, Undo and portable reopening. Included in held PR #109 for fresh manual review.
- **0.6.0 customization and annotations — #111:** type-numbered/custom element names and search; opt-in template section/card/text positioning with layout-space preservation and reset; Step number sequences/manual overrides; free Arrow/Pointer endpoints, labels and styling. Preserve legacy appearance, locks, Undo and editable/offline exports. See [review plan](authoring-customization.md). Fresh manual review required; attached connectors remain out of scope.
- **0.7.0 — Portable AI authoring, import/export and recovery — #119:** LLM-independent instructions/schema/catalog/examples, native layouts/widgets, safe previews/overrides, fit warnings/repair/reflow, individual JSON/editable-ZIP import, browser recovery and downloadable editable/playback exports. PR #118 is merged with maintainer sign-off. Published RC acceptance is recorded; stable promotion is tracked in #122. See [native authoring](ai-layouts-and-elements.md) and [portable workflow/security acceptance](local-workspaces.md). Publication requires separate release preparation.
- **Deferred filesystem investigation — #117:** folder connection/reconnect, linked-file reload/save, native save pickers and folder snapshots are outside 0.7.0. Keep the native Chrome failure evidence open; do not block the portable workflow on further chooser tests.
- **Deferred direct AI providers — #15–#19:** OpenRouter/Ollama adapters, selected-text rewriting and live-provider evaluations remain candidates outside 0.7.0. No API keys or external services are needed for portable authoring.
- **0.8.0 — Editor workbench and direct manipulation — #124:** implement the approved visual concept with shared light/dark styles, compact action hierarchy, a larger laptop canvas, readable Inspector navigation, consistent Library/AI dialogs, resizable panels and clear move/resize/snapping controls. Preserve formats, recovery, Undo and offline exports. See [scope and manual acceptance](editor-workbench.md). Maintainer acceptance is recorded; this scope is included in the combined 0.9.0-beta.1 release.
- **0.9.0 — Inspector and Layers workflow — #126:** shared left Slides/Layers navigation, icon-based visibility/locks, clear naming/batch/reorder controls, separate Horizontal/Vertical slide alignment, compact Style/color editing and selection-driven Content with persistent slide notes. Retire redundant category navigation while retaining existing editing and scoped legacy access. Depends on 0.8.0; preserve lock/Undo/format/recovery/offline contracts. See [scope and manual review](layers-style-workflow.md) and [Content inspector](content-inspector.md). Maintainer manual acceptance is recorded; the separate 0.9.0-beta.1 preparation issue is #128.
- **Deferred optional MCP discovery — #20–#23:** companion/Hermes work is unscheduled and is not a dependency of editor polish. Collaboration remains outside approved scope; Docker distribution is now approved under 0.10.0.
- **Unscheduled format discovery — #73:** portrait/square/print/scrolling canvases and their reflow/export contracts require separate decisions. Current collections remain 16:9 slides, without email, print-ready or website-publishing promises.

Backup verification design: inspect/validate the selected ZIP without importing it into the active project or draft database. Prove restoration separately in a clean profile. Accessibility baseline: Windows with Chrome and NVDA; record exact tested versions before claiming support. Automated matching-Chromium checks are distinct from these manual checks. Other browsers and OBS remain unverified until evidence is recorded.

Track [0.6.0 blocks/components](https://github.com/treisland/presentation-studio/milestone/8), [0.7.0 AI](https://github.com/treisland/presentation-studio/milestone/3), [0.8.0 editor polish](https://github.com/treisland/presentation-studio/milestone/4) and [0.9.0 Layers and Style](https://github.com/treisland/presentation-studio/milestone/9).

## 0.5.1 scoped usability corrections

Stable 0.5.1 is published after patch review and the separate approved release plan (#99/#100). It contains Heading 1–3/Paragraph conversion, retained Heading 3 titles and simplified New presentation example selection. See [the review checklist](0.5.1-manual-test-plan.md).

## Historical development milestones

The numbered sections below record historical development milestones, not published release versions.

## 0.1.0 — Repository foundation

- [x] Preserve the working standalone HTML experience.
- [x] Separate ordered runtime sources, shell, styles, and template bootstrap content.
- [x] Build neutral distributions deterministically.
- [x] Include an importable seven-layout sampler and sample media.
- [x] Document editing, presenting, recovery, sharing, architecture, and contributions.
- [x] Add automated validation, browser tests, and release packaging.
- [x] Prepare private-first content review guidance and third-party notices.
- [x] Publish the repository and prepared foundation.
- [x] Verify hosted Actions and publish alpha release artifacts.

## 0.2.0 — Guided setup and presentation identity

- [x] Four-step setup wizard with defaults and import path.
- [x] Theme-specific logos, safe sizing, placement, and title-slide option.
- [x] Browser-local brand presets with portable JSON including logos.
- [x] Theme preview, saved theme colors, and explicit theme-default reset.
- [x] Project, section-boundary, and slide-level transitions with speed controls.
- [x] Reduced motion, transition cancellation, question jumps, and export coverage.

## 0.3.0 — Compact navigation and recent presentations

- [x] Compact playback toolbar and editor Project/Export menus.
- [x] One Add slide gallery and expandable branding controls.
- [x] Recent browser drafts with previews, search, restore, backup, duplication, and removal.
- [x] Open ZIP/JSON picker and drag-and-drop.
- [x] Save-before-switch guard, visible save state, and media-completeness checks.
- [x] Preservation of differing same-ID local versions on file open.
- [x] Browser-profile restart, failure, export, and switching regression tests.

## 0.4.0 — Generic Studio demo

- [x] Eight-slide neutral demo with three sections, a main loop, and presenter notes.
- [x] Bundled offline sample image and harmless copyable commands.
- [x] Blank, Studio demo, and Import starting choices.
- [x] Vendor deck excluded from generic distributions and release packages.
- [x] Existing legacy ZIP import, question banks, and reset-baseline compatibility.
- [x] Demo layout, offline media, and export/reopen validation.

## 0.5.0 — Theme gallery and direct block editing

- [x] Six coordinated light/dark schemes, current-slide previews, and explicit color-only apply.
- [x] Custom palette tokens and portable theme-only presets.
- [x] Inline text, formatting, cards/lists, table cells, and media selection.
- [x] Edit blocks / interactive Preview modes, safe text paste, and undo.
- [x] Legacy colors and full brand preset compatibility.
- [x] Legacy open/edit/export/reopen, formatting, media, and contrast checks.

## 0.6.0 — Media Focus

- [x] Canvas-local image/video expansion and animated return.
- [x] Image zoom/pan, captions, keyboard return, reduced motion, and focus management.
- [x] Pause/resume advancement and preserve video playback position.
- [x] Presentation and interactive Preview support with portable settings.

## 0.7.0 — Independent open-source launch

- [x] Vendor archives, product content, documentation links, and archive output removed.
- [x] Neutral identifiers with import-only compatibility and browser draft copy migration.
- [x] Synthetic regression fixtures, original icon, Apache License 2.0, and independence statement.
- [x] Clean public source snapshot with an initial Git commit.

## Next candidates

- Optional camera overlay with explicit device permissions and session-only streams.
- Presentation widgets such as timers, lower thirds, and callouts.

- Replace the remaining legacy import adapter with a template registry.
- Add schema documentation and explicit migrations for future project formats.
- Add import/export round-trip coverage across Chromium, Firefox, and WebKit.
- Capture a manual OBS compatibility matrix and video-codec examples.
- Add optional Git-backed approved template publishing.

Accounts, collaborative editing, and a shared database are deferred until there is a concrete need.
