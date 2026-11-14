# Changelog

## Unreleased

## 0.17.0-beta.1 — 2026-11-13

- Prepare the maintainer-authorized Audio & narrated playback beta; retain known issue #241 and original asset compatibility.
- Cancel intentionally interrupted play attempts without false failures and preserve native keyboard input in booth audio controls.
- Allow the complete tag release validation suite the same bounded 30-minute budget as platform validation.

- Add audio corruption/recovery and overall/music acceptance coverage, exact development validation evidence and a concrete pending manual checklist (#247); no audible or release acceptance is inferred from CI.

- Add explicit-gesture audience/booth audio playback, blocked-play recovery, session controls, narration-end padding arbitration and stale-event cancellation (#246). Keep private previews silent and independent audible acceptance pending.

- Add local per-slide/overall narration and independent music authoring, guarded native v5, original asset recovery/ZIP preservation, bounded metadata and explicit preview controls (#245). Live playback and independent acceptance remain separate.

- Record the Audio & narrated playback contract (#244) and maintainer-approved guarded native v5 design; runtime implementation and acceptance remain outstanding.
- Introduce protected dev integration and reviewed dev-to-main promotion, with branch-routing CI and delivery review-thread checks; publication remains main-only.
- Archive shipped milestones while retaining independent validation and known #241; begin Audio & narrated playback with its design contract.
- Record the companion launch at docs.pres-studio.com and separate deployment ownership.

## 0.16.0 — 2026-11-13

- Promote the verified v0.16.0-beta.1 runtime to the maintainer-authorized official release without feature changes. Retain known issue #241 for a patch and recommend window capture; companion public launch remains deferred.

## 0.16.0-beta.1 — 2026-11-13

- Prepare the maintainer-authorized beta for the integrated presentation, Library and custom-background milestone; companion publication remains deferred.
- Document the accepted holding-settings Cancel/Escape fallback defect as known issue #241, with an explicit built-in-design workaround and patch follow-up.
- Record maintainer-reported Chrome, Firefox and Edge acceptance versions; recommend window capture and remove OBS-specific release sign-off by maintainer decision, with future Browser Source deprecation kept separate.
- Align Presenter View to the approved full-window UX: compact title/thumbnail cards, private Live/Preview notes with text sizing, independent scrolling and persistent audience controls.
- Correct true audience blackout and add optional static built-in/custom holding screens with retained live/timer/Q&A state, explicit Restore, session-only choice or undoable portable deck default.

- Add direct slide Background controls to the Inspector with exact single-slide apply, inherited/reset status and the shared staged editor.
- Add private Presenter Previous/Next controls and explicit double-click-to-present on List/Grid cards and the large preview; label audience navigation separately.

- Reconcile merged v0.16 implementation with the remaining acceptance checklist and record maintainer footer sign-off; companion publishing remains local-only.

- Support optional Classic/Modern/Hidden slide footers, including a passive classic audience footer and portable offline playback defaults.

- Add independent presenter live navigation, Follow live, deliberate Q&A resume points, elapsed time and reversible audience blackout.

- Add private numbered List/Grid browsing, local title/text/notes search with literal excerpts, and bounded script-free slide thumbnails in Presenter View (#205).

- Add immutable Presenter View sessions with private notes/browsing, sanitized audience windows, source-validated message channels and explicit live commits (#204).

- Restore the animated per-slide time line, enabled by default with an independent Show slide time bar option; keep seconds and deck position separate (#203).

- Add an independent Show slide timer preference, enabled for both presets and narrow screens; preserve older viewer defaults (#203).

- Add Presentation/Playback control presets, independent focus-safe auto-hide, grouped More controls and explicit portable deck defaults without changing automatic playback (#203).
- Show inert visual thumbnails for saved My components, fitted to the complete composition with original assets preserved.

- Add recognizable icon-and-label Library categories and All/Text/Shapes/Media filters that combine with category-scoped search (#210).
- Add staged representative deck previews, explicit section/selected-slide background targets, override preservation and atomic bulk/reset operations (#216).

- Add staged image readability controls and explicit title/content/divider coordinated background looks with original neutral illustration.
- Add a local-only companion with authentic example previews, canonical guide rendering and separate stable/beta downloads.

- Add a short first-presentation guide and a curated Studio, Portfolio and Newsletter companion content map.

- Record v0.16 development acceptance evidence, local companion rollback and separate manual beta review checklists.
- Add digest-verified, reproducible companion screenshot recipes and ignored before/after review candidates with provenance.

- Focus the appended saved-component duplicate so keyboard Rename edits the new copy (#209).

- Make Library Insert and saved-component Rename/Duplicate/Delete permanent labeled actions, expose save/backup/recovery controls and add explicit inline rename commit/cancel (#209).
- Keep decorative effects above custom bases and below content regardless of initialization order; apply the authoring JSON limit to decoded JSON, excluding bundled images (#213).

- Add staged presentation/slide Theme, Solid, Gradient and Image backgrounds with complete overrides, local images, focal Fill/Fit, guarded native v4/portable-authoring v2, recovery-aware asset retention and shared offline/booth rendering (#213).

- Keep More menu labels readable before hover, fit multi-slide phone controls, and show remaining time for completion-driven videos (#202).

- Unify viewer controls into a slim viewport footer with deck-position progress, separate timed countdown and a bounded searchable slide navigator; retain shared playback actions and offline rendering (#202).
- Document the proposed custom-background inheritance, layering, asset recovery and guarded native/portable format contract for maintainer review (#212).
- Define companion guide/screenshot ownership, provenance, human review and local rollback responsibilities in contributor, agent, PR and release workflows (#193).

- Define the locally reviewed companion-site architecture, canonical guide ownership, screenshot provenance and deferred publication boundary (#192).

## 0.15.0-beta.1 — 2026-11-12

- Add shared right-click, Shift+F10/Menu-key and visible ⋯ actions for Library cards and placed objects, with selection-preserving shortcuts, type-specific Inspector navigation, explicit saved-component deletion, keyboard submenus, touch targets and stale-selection guards (#190).
- Keep unmasked image/video crop shortcuts out of masked drag mode, and stop muted clip previews when the selected object or grid cell changes (#189).

- Consolidate selected image/video, grid sizing, placement, caption, playback and poster editing in the Inspector; retire the Media Manager entry point and duplicate media list, add compact Placement shortcuts and scoped media restoration, and retain legacy settings import/export through Project (#189).
- Flatten text Inspector editing into one Text section, shorten formatting guidance, and share one content scroller for selection help, controls and notes; retain lock guidance before the active editor after selection changes (#200).

- Add independently collapsible Inspector sections with session preferences by selection type, shared notes visibility, collapsed context summaries and shortcuts that reveal the existing editor; retain controls and saved-project formats (#188).

## 0.14.0-beta.1 — 2026-11-12

- Honor Left, Right and Background on the first media drop/upload using the same atomic placement operation as later changes; retain existing media geometry (including rotated structured frames), metadata, locks and one-step Undo (#184).

- Preserve staged color/opacity values and the text caret when resizing the editor or Inspector; audit existing same-target field, scroll, panel-choice and overlay focus behavior (#176).

- Clarify selected item/type, shared/group/member and active text context; show actionable movement blockers, accurate keyboard units and completed keyboard-move announcements (#175).

- Explain template-managed positioning with explicit Enable free positioning and Reset to template position actions, plus structured-layout and lock guidance (#174).
- Share movement snapping across individual blocks, floating media and batch/group bounds; add Shift axis locking, Alt bypass, a four-CSS-pixel move threshold and reliable gesture cancellation (#173).

- Keep block, media and group movement/resize targets consistent in screen space, with reachable grips at visible canvas edges and clearer locked-handle guidance (#172).
- Add a reproducible neutral canvas-interaction profiling harness and measured baseline, separating drag/snapping costs from post-gesture refresh costs (#177).

## 0.13.1-beta.1 — 2026-11-11

- Keep Library text entry responsive on the canvas and in the Inspector by avoiding export-pack creation and edit flushing during status updates; retain grouped Undo, local recovery and editable ZIP backups.

## 0.13.0-beta.1 — 2026-11-11

- Reset masked image zoom on entry to standalone booth Media Focus, including when image zoom controls are disabled, and restore the mask transform on return.

- Keep every drop-placement target visible with long filenames, put all media Inspector controls in one scroll area, and save frame choices/gestures directly without Apply frame.

- Preserve media geometry and per-object mask/style settings when switching Library media to left, right or background placement, including primary-media swaps and Undo.

- Add border-padding sliders and precise percentage entry for media masks, retaining the outer contour and showing the frame fill between media and border.

- Make masked media backgrounds, borders and shadows follow the mask contour, including offline booth exports, while keeping captions and editor resize handles separate.

- Add Library buttons and reusable slide/external link actions with keyboard Preview/playback navigation, stable destinations and new-tab external resources.
- Add reusable image/video frame placeholders and rectangle/rounded/circle/oval masks with shared numeric zoom/crop/radius sliders, direct crop dragging and offline round trips.
- Keep button presets visually distinct, show expanded action controls at the top of Content, save complete choices immediately and indicate pending URL edits without an Apply action step.

- Restore Orbit Color 2 and Color 3 on individual SVG rings, preserving all three saved palette slots in previews and offline playback/booth.

## 0.12.0-beta.1 — 2026-11-11

- Replace repetitive editor actions with consistent outline icons and contextual hover/keyboard-focus tooltips. Keep Edit blocks/Preview labels and active modes, existing guarded actions, Undo, accessible names and light/dark/touch/forced-color support.

- Keep every numeric slider visible whenever its setting is shown; remove reveal/hide buttons and stack narrow coordinate/formatting controls beneath their number fields.

- Add shared slider/number/unit/reset controls across background, appearance, text, media, branding, rotation, arrow and workspace settings. Keep coordinates compact with always-visible stacked tracks, provide timer presets/Off, and retain counts as discrete fields.
- Preview direct adjustments without per-tick project writes; commit a gesture as one Undo step. Preserve staged Apply flows, mixed values, locks, selection/revision guards, inherited font reset, keyboard navigation, wheel scrolling and existing saved formats.

- Improve the beta background renderer with purpose-built SVG Orbit/Aurora/Waves compositions, independent ribbon flow, coordinated theme-derived colors, and fewer deliberately placed floating shapes. Keep custom hues, monochrome themes, motion safeguards and offline playback/booth behavior.
- Add staged style variations, Subtle/Balanced/Expressive strength choices, explicit motion status and an inert Current slide preview. Map these controls to existing placement/scale/intensity values, preserving custom values and native-v3 compatibility without new saved fields.
- Restore all three Constellation palette colors in standard and reduced quality, including custom Color 3 in previews and offline viewers.

- Bring backgrounds closer to the concept with flowing vector Waves ribbons, a denser gently drifting Constellation network, layered chromatic Aurora veils and clearer orbital/geometric motion. Clarify Static preview behavior and place Background immediately after Presentation settings.
- Fix paused slide autoplay unintentionally freezing Animated backgrounds; keep the viewer background switch, reduced motion, Disable motion and media-focus pause safeguards independent.

- Improve background preset visibility with stronger Waves linework/ribbon shading, a connected Constellation network and brighter points, clearer Orbit/Aurora/Drift decoration, and lighter theme-linked colors on dark slides. Preserve quiet content areas, explicit custom colors and existing saved settings.

- Record explicit manual acceptance of the final PR #161 build and activate the protected beta release plan.

- Add theme-aware Orbit, Aurora, Waves, Constellation and Geometric Drift backgrounds, presentation defaults/slide overrides, independent grid visibility, static/motion modes, accessible previews and viewer motion controls (#150–#154, #158).
- Preserve legacy orb appearance and ordinary v2 exports; use maintainer-approved guarded native v3 for effect settings and their history/recovery. Retain v1/v2 imports, IDs, media, Undo and offline editable/playback/booth support.
- Extend the generated AI authoring catalog/schema and examples with validated background options. Keep editor/navigation snapshots static, pause inactive motion, and fix theme-gallery refreshes treating buttons inside media previews as theme choices.

## 0.11.0 — 2026-11-11

- Promote the tested 0.11.0-rc.1 to stable with explicit production sign-off. Publish the same accepted application scope through production GitHub Pages and versioned/stable Docker channels; no runtime, dependency or format changes from RC.

## 0.11.0-rc.1 — 2026-11-11

- Promote accepted 0.11.0-beta.2 to release candidate with maintainer sign-off. Retain table/group workflows, panel-edit data preservation, stable navigator previews and the matched Playwright CI toolchain; no runtime, dependency or format changes.

## 0.11.0-beta.2 — 2026-11-11

- Keep existing template table selection active while using row/column actions and table Inspector controls, so focusing a dropdown no longer dismisses the editing tools (#139).
- Keep slide navigator thumbnails and titles stable during text editing; refresh at item/slide boundaries and completed actions while preserving card DOM, scroll/focus and a fixed two-line title area (#143).
- End inline cell editing when panel fields take over, retaining panel focus and table context so returning to the canvas cannot overwrite panel edits.
- Refresh cached navigator previews after completed layer appearance, secondary-media placement and visibility changes, including Undo/Redo.
- Run Linux validation and release packaging in a matched, digest-pinned Playwright image to avoid live Ubuntu dependency downloads; retain Node 22, independent native Windows checks and all release gates.

## 0.11.0-beta.1 — 2026-11-11

- Add contextual table row/column insertion and deletion, lossless structural edits, optional headers, theme-aware presets, alternating rows, borders and spacing. Preserve headerless tables and reusable component styling (#135).
- Add Shift+click and drag-box canvas multiselection, visible Group/Ungroup actions and shortcuts, shared move/resize bounds, group member editing and synchronized Layers selection (#135).

## 0.10.0-beta.1 — 2026-11-10

- Make fresh-checkout Docker/Compose startup build its own application assets without host Node/npm; retain an explicit verified-prebuilt target for release publication (#132).
- Add embedded app version/build identity, offline About and private-data-free diagnostics, with import compatibility guidance.
- Add hardened static Docker/Compose serving, verified published-release GHCR/Pages promotion and isolated CI-artifact review deployment. Preserve four canonical release downloads and manual release gates.

## 0.9.0-beta.1 — 2026-11-10

- Omit hidden media-grid configuration roots from playback instead of creating invalid empty grid spacers; verify the exported project reopens offline with its IDs and without hidden media.
- Make Inspector Content follow the selected object, retire legacy category navigation and generic object pickers, and add a persistent slide-scoped notes drawer. Retain scoped legacy text access, table/code/widget/media editing, pending edits, locks and Undo.
- Replace the combined block-alignment menu with separate Horizontal and Vertical icon groups, explicitly aligned to the slide. Combine axes for corners and edge centers while preserving size, content, layer and Undo.
- Redesign Layers and Style for the 0.9.0 milestone: a shared left Slides/Layers dock, accessible visibility/lock icons and compact right-side appearance summaries with on-demand color editing. Approved together with the 0.8.0 workbench changes for this beta.
- Fix hidden content collapsing template layout or remaining visible through template display rules. Preserve neighboring geometry and exclude hidden content from playback exports while retaining empty layout spacers where needed.

- Redesign the editor as a canvas-first workbench with shared light/dark styling, clearer action hierarchy, responsive panels, rail resizing, focused Inspector and consistent Library/AI dialogs.
- Add direct Snap and editable ZIP Export actions, explicit template Move / resize access, and clearer multi-direction block resizing while retaining locks, cancellation, Undo, recovery and offline compatibility. The integrated workbench and Inspector passed maintainer review.

## 0.7.0 — 2026-11-09

- Promote the accepted 0.7.0 RC to stable with recorded manual gate and published-artifact sign-off. Includes the portable AI workflow and 0.6.0 authoring features; no runtime or dependency changes from the RC.
- Keep live folder access and linked filesystem saves deferred. Preserve prior beta/RC tags, projects, media/history, recovery and offline exports. See docs/releases/0.7.0.md for scope, limitations and backup guidance.

## 0.7.0-rc.1 — 2026-11-09

- Simplify 0.7.0 to portable AI presentations: individual JSON/editable-ZIP import, safe review and repair, ordinary editable ZIP downloads and independent browser recovery. Defer folder browsing, linked saves/reloads, native save pickers and folder snapshots; retain existing projects, files and old workspace preferences.
- Extend portable authoring with Auto/explicit native-element layouts, editable Library widgets, balanced typography, visual import review and fit/repair feedback; preserve earlier authoring-v1 inputs.
- Add provider-independent AI instructions/schema/catalog/examples. Explain truncated JSON without changing the active project. Maintainer feature sign-off is recorded; release-gate confirmation and published RC artifact acceptance are tracked separately.

## 0.6.0-beta.1 — 2026-11-09

- Add per-type element names and Layers search/custom overrides, opt-in template section/text/card positioning with reset, numbered Step widgets with independent sequences/manual overrides, and free Arrow/Pointer annotations with editable endpoints and portable playback/booth rendering.
- Allow template/demo primary-heading deletion and independent duplication with lock/Undo protection. Keep the slide name when its visible heading is removed, strip title/layout-slot roles from copies, and show/edit the selected heading in the Inspector instead of its eyebrow sibling.
- Make Inspector Content, Style and Arrange follow the selected object, with selection breadcrumbs, group-member inspection, stable tabs, explicit slide settings and an opt-in plain-text editor. Keep canvas text editing primary and preserve structured widget/code/table editors and legacy workflows.
- Add unified element hide/show in Layers and Inspector, editor-only hidden-element inspection, group visibility that preserves child settings, and inherited presentation/slide header, footer, logo, slide-number and decoration visibility. Editable backups retain hidden content; playback excludes hidden elements.
- Make Library Tables and Code movable/resizable/removable free blocks with lock/Undo protection; add explicit conversion for older layout content and polished live Library previews.
- Add Data & Code Library insertion for Tables and shared Code/Commands, with optional language/environment labels, named variants, default/OS preferences and block hiding. Preserve legacy platform content and offline exports.
- Keep Text format available while editing text inside free blocks and widgets.
- Redesign the Library with scoped dialog typography, Blocks/Widgets/My components tabs, consistent preview cards and Media insertion, search/clear, per-preset Options and separate library management/recovery controls.
- Replace the cramped scrolling beta toolbar with contextual Text format, Appearance, Image, Arrange and More popovers; keep Add/Library and view controls reachable without horizontal scrolling.
- Add contextual block formatting, searchable Add/Library, editable Callout/Quote/Metric widgets, one-level groups and independent portable component presets with local deletion recovery.
- Record maintainer approval of the merged beta and confirmation of manual release gates. Exact manual environment versions were not supplied; see the versioned validation record and limitations.

## 0.5.1 — 2026-11-08

- Preserve converted Heading 3 titles in their title slot during retained-content layout changes, including Undo and editable reopening.

- Remove duplicated starter/demo choices from New presentation. The dedicated gallery retains all examples, including Studio demo, and continues into naming/theme setup before creation.

- Expose Heading 1–3 and Paragraph conversion in Inspector Content while retaining inline formatting, text selection, layout identity, title synchronization, locks and Undo.

## 0.5.0 — 2026-11-08

- Promote the published, maintainer-approved 0.5.0 candidate to stable without runtime, dependency or project-format changes. Includes the five layout collections, examples, gallery, walkthroughs and reviewed retention/caption/selected-cell fixes.
- Record published-candidate sign-off and retain recovery guidance and documented environment limitations.

## 0.5.0-rc.1 — 2026-11-08

- Preserve custom Editorial mastheads during retained layout changes, keep Comic preview captions visible, and direct visual walkthrough steps to the selected-cell inspector.

- Complete the sampler with all thirty core/collection layouts, including Blank, and consolidate viewport, gallery entry-point and manual acceptance evidence.

- Add explicit optional Portfolio, Comic and Editorial editor walkthroughs with static control cues, keyboard navigation, Skip/Close/Replay and reduced-motion support. Guide state stays outside projects and exports and closes on project switching.
- Add a view-only example gallery with purpose/image-layout filters, complete slide previews and readable image descriptions. Separate starter/demo creation uses save-before-switch and handles unavailable artwork without replacing the active project.
- Consolidate cross-example identity/reset and complete offline export checks across the three core pairs and lightweight starters. Keep each project's own reset baseline after repeated resets instead of falling back to the Studio demo.
- Copy new examples' artwork from immutable bundled originals into fresh asset paths so imported filename collisions cannot substitute library visuals or overwrite a prior draft's media.
- Add three Flyer compositions and a lightweight starter for events, announcements and portfolio covers, with original replaceable artwork, readable calls to action and explicit 16:9 slide-format labeling.
- Add four Newsletter compositions and a lightweight prompt starter with lead story, recurring updates, curated resources and closing action. Output is explicitly newsletter-style slides, without email HTML or sending.
- Add five Editorial compositions with newspaper masthead/columns and blog-style lead/image/closing treatments, a complete fictional starter/demo pair, deliberate column reading order and long-article overflow checks.
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
