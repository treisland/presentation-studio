# Changelog

## Unreleased

- Add four Comic compositions and an original seed-sharing starter/demo with editable speech, numbered captions and independently cropped panels. Composition colors and typography inherit the project theme.
- Expand Portfolio to five theme-independent compositions: case study, process, results, image gallery and details/credits. Provide a five-slide prompt starter and finished fictional demo with four original offline diagrams and independent gallery crops.
- Preserve complete retained tables, including empty cells/rows, and other protected structures during collection layout changes.
- Begin layout collections with a theme-independent Portfolio case-study composition, a prompt starter and a finished fictional example with an original offline diagram.
- Preview text/image mapping before a collection layout change; keep unmatched content, media identities and recovery, respect locks and apply as one Undo step. Flag long text and title/body overlap without shrinking text.
- Document 0.5.0 layout/example planning and rename future AI/MCP milestones to 0.6.0/0.7.0.

## 0.4.0 — 2026-11-08

- Promote the maintainer-tested published release candidate to stable. Includes styling/swatches/picker, blank/clear slides, Layers and precision snapping, with atomic Grid removal fixes. No runtime, dependency or project-format changes since rc.1.
- Record published-candidate manual sign-off and retain documented environment limitations, backup and recovery guidance.

## 0.4.0-rc.1 — 2026-11-08

- Clear Grid layers together with their nested media, retaining Undo/recovery, and reject duplicate layer keys before removal can affect unrelated content.
- Add theme-linked/custom text, fill, border and slide-background colors with opacity, named project swatches, contrast estimates, presets and copy/paste appearance.
- Pair Custom hex with a synchronized native color picker; draft color changes apply only when confirmed with Apply custom.
- Add a blank slide template and lock-aware clear-selected/confirmed clear-slide actions with atomic Undo and recovery retention.
- Add a Layers tab with synchronized selection, batch appearance, object naming, hide/lock and keyboard/pointer ordering. Grid cells remain nested; background media stays pinned.
- Extend block/media snapping with object edges/centers, equal-spacing guides, a session toggle, Alt bypass and screen-pixel tolerance. Add validated rotation and preserve styling/layers in portable exports.

## 0.3.0 — 2026-11-08

- Promote the tested release candidate to stable after maintainer sign-off. Includes the canvas workspace, additive media, draggable blocks, Media Grid, local editing API and panel polish. No runtime, dependency or project-format changes since rc.1.
- Retain documented support limits, complete editable backup guidance and unknown manual environment details.

## 0.3.0-rc.1 — 2026-11-08

- Polish Slides and Inspector panels with directional collapse/reveal rails, pinned selection actions, Content/Arrange/Style sections and keyboard-accessible thumbnail actions. Duplicate slides retain additional/grid media.
- Keep Grid cell fields and removal actions synchronized when selecting media from the Inspector object list.

- Fix circle block Move/Resize controls being clipped by the rounded shape in the editor.

- Add Media Grid templates with named file-drop cells, presets/custom row and column counts, fit/crop, safe overflow retention, cell swaps and pointer/keyboard divider resizing.

- Remove the redundant visible Expand control; a named Media Focus keyboard action appears on focus in presentation, Preview and portable booth playback.

- Add a text/shape/callout palette with stable content-block IDs, slide-relative dragging/resizing, snapping, alignment/layers and keyboard arrangement through atomic editing operations. Existing content, media and recovery/export behavior are preserved.

- Keep added background media behind original slide text in editing, Preview and exported playback without changing the content layout.

- Make media additions preserve existing content by default, with explicit named/previewed replacement confirmation, cancellation and stale-project protection. Remove the opt-in additional-object checkbox.

- Keep editing batches BUSY throughout inline text sessions, including pauses after typing saves; reject invalid title input before opening a typing transaction.

- Add a versioned local editing API for atomic slide metadata/create and existing-media placement batches, with stale-revision rejection, shared locks/validation, one undo step and a recovery checkpoint. Reuse the contract in title, gallery and Free placement controls.

- Add collapsible Slides/Inspector panels and keyboard-operable width controls; Fit follows window/panel resizing while manual zoom stays selected. Panel state remains outside projects and undo history.

## 0.2.0 — 2026-11-07

- Promote the tested release candidate to stable after maintainer sign-off. Includes readiness checks, isolated backup verification, media round-trip coverage and keyboard/accessibility improvements. No runtime or project-format changes since rc.1.
- Document support limitations, complete editable backups and recovery guidance; retain unknown manual environment versions as unknown.

## 0.2.0-rc.1 — 2026-11-07

- Prepare the first release candidate after maintainer confirmation that the published beta.1 package passed testing. No runtime or project-format changes since beta.1.

## 0.2.0-beta.1 — 2026-11-07

- Prepare the 0.2.0 beta feature freeze and consolidate maintainer-reported test evidence; the maintainer authorized beta publication with documented evidence limitations.

- Make keyboard ZIP import validation independent of native headless file-picker interception while checking keyboard activation of the import control.

## 0.2.0-alpha.2 — 2026-11-07

- Name slide movement controls and editor/settings tab panels for assistive technology; keep Tab navigation within readiness/backup dialogs. Add keyboard authoring/import/export regressions and a manual accessibility evidence checklist.

- Inspect original ZIP directory members before JSZip deduplicates paths, rejecting duplicate/ambiguous entries and enforcing limits against all original members.

- Add isolated editable ZIP verification for project structure, active/recovery asset completeness, archive CRC integrity and safe paths, without importing HTML or changing the active project/draft. Include limits and cancellable verification.

- Add original H.264 MP4 and VP8 WebM fixtures with playback, focus continuity, editable import and editable/playback export/reopen regressions.

## 0.2.0-alpha.1 — 2026-11-07

- Add a read-only Presentation readiness report with missing asset and overflow blockers, loop/visibility advisories, portable backup freshness, browser video capability guidance, and direct editor navigation.
- Preserve slide/settings destination focus after navigating from readiness findings; ordinary dismissal restores focus to Check readiness.

- Discover draft releases through authenticated paginated listings and verify their immutable tagged commit after main advances. Add full delivery lifecycle regression coverage and distinguish discovery errors from artifact errors.

- Fix automatic delivery failing with HTTP 404 when checking repository settings; preserve protection and release gates.

## 0.1.4-alpha — 2026-11-07

- Establish contribution and release policies, agent instructions, issue/PR acceptance templates, protected validation, and monitored automatic delivery.
- Add tested release gates for exact-commit Windows/Linux checks, explicit release plans, stage evidence, and four verified artifacts.
- Align project licensing metadata, documentation, and in-app help with Apache License 2.0. Third-party licenses remain unchanged.

### 0.1.3-alpha preparation

- Use isolated operating-system temporary directories for experience-test downloads.
- Track editable ZIP freshness separately from browser-local saving, including text changes.
- Restore settings focus, contain keyboard navigation within settings, and improve compact editor controls and focus indicators.
- Add media readiness diagnostics and Windows validation alongside Linux.
- Align package, lockfile, README and roadmap release identity with automated checks.

## 0.1.2-alpha — 2026-11-07

### Fixed

- Escape project text safely in editable and playback exports so script delimiters cannot break embedded JSON or execute scripts when exported HTML is opened.
- Collect assets from media and logo fields, including recovery history and reset baselines. Ordinary slide text and presenter notes such as `assets/example.png` no longer block saving or exporting.
- Replace the HTML dependency test's regular expression with browser DOM checks that handle attribute spacing, case, and stylesheet token lists.

### Added

- Regression coverage for safe export/reopen behavior, path-like text, and recovery asset references.

The entries below retain the earlier development milestones and numbering.

## Unreleased — Editor workspace

Added a three-column editor with a contextual inspector, sectioned lazy-rendered thumbnails, lock/hidden indicators, within-section drag reordering, block font-size controls, and a separate project settings dialog. Added Fit and 50–200% editor zoom, pointer-centered wheel zoom, keyboard shortcuts and Space/middle-button panning. Transient view state does not enter project data or playback. Existing editing, booth and legacy import flows remain supported.

## Unreleased — Direct media editing and booth mode

Added preview file-drop zones, a draggable/keyboard-accessible placement grid for existing media, replacement, free placement, proportional resize, snapping, crop, keyboard nudges, multiple media objects, layering, captions, alternative text, hide/delete, and single-operation undo. Added object/slide/presentation design locks and protection against indirect section edits.

Added configurable conference booth permissions, passphrase unlock, persistent browser lock/draft recovery, question access, idle return, and a separate offline booth playback export without authoring code, private notes or recovery content. Optional validated fields preserve older imports.

## 0.7.0 — Independent open-source release

Removed the archived vendor deck, product Q&A, commands, results, documentation links, and archive build. Added neutral export/schema/storage identifiers, import-only compatibility, a copy migration for browser recovery drafts, synthetic compatibility fixtures, an original icon, and the MIT license. Public source is prepared with a clean initial history.

## 0.6.0 — Media Focus

Added click-to-focus images and videos in the presentation and interactive editor Preview. Expand and return animations stay within the slide canvas, slide advancement pauses and resumes its prior state, and videos retain their element and playback position. Images support bounded zoom/pan and Fit. Return, Escape, focus trapping, reduced motion, caption controls, and project-level defaults are included. Existing projects remain compatible. Camera capture and widgets remain future work.

## 0.5.0 — Themes and visual block editing

Added a live theme gallery with six paired light/dark schemes, optional palette tokens, custom colors, and portable theme-only presets. Explicit scheme application preserves logos, fonts, and content. Older presentations retain their saved colors.

Added direct text, card/list, and table-cell editing in the slide preview, with formatting, alignment, duplication/deletion where supported, media/logo selection, and an interactive Preview mode. Safe text paste, project undo, side-panel synchronization, and preview video behavior are covered by regression tests. Legacy legacy ZIPs were verified through open, edit, theme change, export, and reopen.

## 0.4.0 — A generic starting experience

Made From idea to presentation the default eight-slide demo, with neutral branding, sample media, a harmless command, searchable Q&A, and presenter notes. Blank, Studio demo, and Import replace vendor-specific starting choices. The main loop excludes Questions for live discussion.

Removed stock vendor deck content and documentation links from generic HTML and release packages. Existing legacy schema-v2 ZIPs still import with their questions and their own reset baseline. Added an offline demo editable ZIP and layout/media compatibility checks.

## 0.3.0 — Compact controls and recent presentations

Consolidated playback actions into a smaller toolbar with More, and editor actions into Project and Export menus. Add slide now opens the visual gallery; logo controls and brand presets are expandable.

Added a shared Presentations picker with recent browser drafts, search, first-slide previews, file selection and drag-and-drop, editable backups, duplication, and confirmed local removal. Switching waits for a complete transactional local save and keeps the active project open on failure. Reopening a differing file with the same project ID preserves the previous local version separately. The editor header now shows project name and local-save state.

## 0.2.1 — Presentation theme fix

Fixed the actual presentation background retaining the original light palette after selecting dark mode. The stage-specific base style now yields to the project theme. Added regression coverage comparing the live canvas with the editor preview in light and dark modes, including closing the editor.

## 0.2.0 — Setup, branding, and transitions

Added a four-step project wizard, browser-local and portable brand presets, theme-specific logos with size and placement controls, and optional title-slide logos. Theme changes retain custom colors and provide an explicit reset to theme defaults.

Added project and slide transitions, section-boundary overrides, speeds, and previews. Navigation cancels pending animations, questions jump instantly, video playback and slide timers wait for transition completion, and reduced-motion settings disable movement. Older projects retain instant navigation. Settings and logos survive editable and playback exports.

## 0.1.0 — Repository foundation

Organized the existing Presentation Studio into maintainable source fragments and a deterministic standalone build. Added neutral and legacy starting distributions, a layout sampler, sample media, documentation, build/browser checks, and draft release packaging.

Existing features include project creation, independent dark themes, visual layouts, editable sections, question navigation, media placement, recovery, and portable editable/playback exports.
