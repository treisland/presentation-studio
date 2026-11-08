# Roadmap

## Current delivery plan

Stable 0.4.0 is published after maintainer testing/sign-off; see [the evidence record](releases/0.4.0-evidence.md). The maintainer authorized proceeding with 0.5.0, beginning with shared foundations and the first Portfolio review checkpoint. Feature PRs do not select release versions. See [release stages and contribution flow](release-process.md). GitHub milestones and linked issues hold acceptance criteria and delivery state.

- **Completed — 0.4.0 stable delivery:** styling/swatches/picker, blank/clear, snapping, Layers and reviewed removal fixes. See [stable notes](releases/0.4.0.md) and [feature guide](styling-and-precision.md).
- **Now — 0.5.0 layout collections and examples:** shared foundations and the first theme-independent Portfolio composition/starter/demo are in progress for manual review. After that checkpoint, expand Portfolio/Case study, Comic, Editorial (Newspaper/Blog), Newsletter and Flyer, then the example gallery and optional walkthroughs. See [the scoped plan](layout-collections.md) and #63–#72.
- **Completed — 0.3.0 canvas enhancements:** responsive workspace, shared editing API, additive media, draggable blocks, Media Grid, accessible Media Focus and Inspector polish. Detailed environment follow-ups #7/#9 remain visible.
- **Deferred:** camera overlays, template publishing, accounts and collaboration until the core workflow is dependable.

- **0.6.0 — AI assistance:** architecture/privacy decisions, OpenRouter/Ollama connections, selected-text rewriting, proposal acceptance and evaluation. Notes and editorial review remain stretch scope. Existing issues #15–#19 retain membership in this renamed milestone.
- **0.7.0 — File-based MCP:** optional companion, transactional editing, previews/readiness, separate ZIP exports and Hermes integration. Existing issues #20–#22 retain membership in this renamed milestone. Live session editing remains discovery #23.
- **Unscheduled format discovery — #73:** portrait/square/print/scrolling canvases and their reflow/export contracts require separate decisions. Current collections remain 16:9 slides, without email, print-ready or website-publishing promises.

Backup verification design: inspect/validate the selected ZIP without importing it into the active project or draft database. Prove restoration separately in a clean profile. Accessibility baseline: Windows with Chrome and NVDA; record exact tested versions before claiming support. Automated matching-Chromium checks are distinct from these manual checks. Other browsers and OBS remain unverified until evidence is recorded.

Track [0.4.0 candidate/stable delivery](https://github.com/treisland/presentation-studio/milestone/5), [0.5.0 layouts/examples](https://github.com/treisland/presentation-studio/milestone/6), [0.6.0 AI](https://github.com/treisland/presentation-studio/milestone/3) and [0.7.0 MCP](https://github.com/treisland/presentation-studio/milestone/4).

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
