[![CodeQL](https://github.com/treisland/presentation-studio/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/treisland/presentation-studio/actions/workflows/github-code-scanning/codeql)
[![Validate and build](https://github.com/treisland/presentation-studio/actions/workflows/validate.yml/badge.svg)](https://github.com/treisland/presentation-studio/actions/workflows/validate.yml)
[![Draft release](https://github.com/treisland/presentation-studio/actions/workflows/release.yml/badge.svg)](https://github.com/treisland/presentation-studio/actions/workflows/release.yml)

# Presentation Studio

[![Release](https://img.shields.io/github/v/release/treisland/presentation-studio?include_prereleases)](https://github.com/treisland/presentation-studio/releases)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Contributing](https://img.shields.io/badge/Contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

![Presentation Studio icon](assets/logo_light.png)

A portable HTML presentation player and editor. Start with a short, generic demo or a blank presentation, then add your own content, branding, questions, and media. No application server or database is required.

## Start here

Download and unzip a release or a successful **Validate and build** Actions artifact.

| File | Starting experience |
| --- | --- |
| `presentation-studio.html` | **From idea to presentation** — an eight-slide, editable Studio demo |
| `presentation-studio-blank.html` | One neutral starter slide and section |
| `studio-demo-editable.zip` | Portable Studio demo project, including its sample image |

Click **Edit** or press **J**. Use **Project → New presentation** for **Blank**, **Start from an example**, or **Import**. **Project → Start from an example** opens the filtered preview gallery; see [the example guide](docs/examples.md). **Presentations** (or **P**) opens recent browser drafts and project ZIP/JSON files. Export an editable ZIP to save a complete portable copy; playback ZIPs are for delivery.

The revised 0.7.0 implementation adds **Project → AI presentations**: download provider-independent instructions, validate generated JSON, review layouts and native elements, then import and export portable editable ZIPs. Browser recovery remains independent of downloadable backups. Live folder access, linked saves/reloads and folder snapshots are deferred outside this milestone (#117). See [the portable workflow and manual checklist](docs/local-workspaces.md). PR #118 is merged with maintainer sign-off. The published RC is accepted; stable 0.7.0 promotion is tracked in the [validation record](docs/releases/0.7.0-validation.md).

AI authoring also supports Auto/explicit layouts, native Library widgets and safe slide previews with fit warnings and layout overrides. Downloaded instructions include a generated capability catalog and three complete examples. See [the native authoring plan](docs/ai-layouts-and-elements.md).

![Generic Studio demo](docs/images/studio-demo.png)

## What's in the demo?

Eight slides demonstrate Hero, Comparison, Workflow, Table, Media, Commands, Q&A, and Closing layouts. Sections are **Overview**, **Demonstration**, and **Questions**. The main seven-slide loop leaves the question for live discussion. Presenter notes suggest a short demonstration for each slide. The bundled SVG works offline; displayed commands only print a greeting and are never executed by the studio.

## Capabilities

- Compact playback controls and editor Project/Export menus.
- Recent browser projects with previews, search, backup, duplication, and removal.
- Structured text, tables, questions, commands, notes, and image/video placement.
- Media Focus: animated expansion/return, image zoom/pan, video continuity, and paused slide advancement.
- Six paired light/dark color schemes with live previews, custom tokens, and portable theme presets.
- Direct block editing for text, cards, lists, table cells, and media selection, alongside existing panels.
- Independent editor appearance, logos, and portable brand presets.
- Slide transitions, section-boundary options, reduced motion, and instant question jumps.
- Stable slide/section identities, custom loops, undo/redo, checkpoints, and Trash.
- Save-before-switch protection and complete editable/playback exports.

Browser drafts are local recovery copies, not shared backups. Keep an editable ZIP after important changes.

![Theme gallery](docs/images/theme-gallery.png)

![Direct block editing](docs/images/block-editing.png)

## Existing presentations

Open an existing editable ZIP through **Presentations → Open ZIP / JSON**. Older projects retain their slides, sections, questions, notes, media, and reset baseline. An import-only adapter accepts previous format identifiers; new exports use `presentation-studio-project`. No vendor templates or content are included.

## Develop

Requires Node.js 22 or later. Build and package scripts use Node built-ins and the vendored ZIP runtime; browser tests use Playwright.

```sh
npm ci
npx playwright install chromium
npm run check
npm run package
```

For a localhost preview, run `npm run serve`, then open `http://127.0.0.1:4173`. File opening also works. Set `CHROMIUM_EXECUTABLE_PATH` to reuse an installed Chromium binary.

| Path | Purpose |
| --- | --- |
| `src/shell.html`, `src/styles/`, `src/runtime/` | Shared player, editor, project picker, and UI |
| `templates/studio/` | Generic demo, bootstrap, and offline template support |
| `templates/blank/` | Neutral blank starter |
| `examples/` | Layout sampler and sample media |
| `scripts/`, `tests/` | Deterministic builds, packaging, and browser checks |

[Quick start](docs/quick-start.md) · [Architecture](docs/architecture.md) · [Contributing](CONTRIBUTING.md) · [Content and branding](docs/content-and-branding.md) · [Open-source release](docs/open-source-release.md) · [Roadmap](docs/roadmap.md) · [Troubleshooting](docs/troubleshooting.md)

Version 0.13.1-beta.1. Beta hotfix for Library typing responsiveness on the canvas and in the Inspector, preserving grouped Undo, local recovery and portable authoring/playback. Released under the [Apache License 2.0](LICENSE). See the [hotfix notes](docs/releases/0.13.1-beta.1.md), [validation record](docs/releases/0.13.1-beta.1-validation.md) and [feature guide](docs/interactive-elements.md).

## Development process

See the [release process](docs/release-process.md), [contributor guide](CONTRIBUTING.md), and [roadmap](docs/roadmap.md). Approved issues define work; protected PRs must pass Windows/Linux validation. Automatic delivery merges eligible PRs and publishes explicitly planned versions after release checks and artifact verification.

Presentation Studio is an independent community project maintained under **se-appsec-sandbox**, with no implied vendor affiliation or endorsement. Users supply and are responsible for their own presentation content and branding.

## Media Focus

Click an image/video or its **Expand** button while presenting. **Return to slide** or **Escape** animates it back. Images support the zoom buttons, mouse wheel, double-click, drag to pan, and **Fit**. Video controls remain available. Presentation advancement pauses while focused and restores its previous state afterward.

Configure enablement, animation, captions, and image zoom under **Editor → Presentation settings → Media Focus**. Focus also works in interactive **Preview**; **Edit blocks** continues selecting media for editing. Focus settings travel with editable and playback exports.

Focus fills the presentation canvas. An OBS camera source stays separate; use **Browser Source → Interact** to click the presentation. Camera capture and widgets are not included in this release.

## Direct media editing and conference booths

Drag images/videos onto the slide preview in **Edit blocks**, choose a placement zone, then use floating frames, resize handles, crop, snapping, keyboard nudges, and the media inspector. Add multiple media objects, adjust layers, and lock objects, slides or the presentation against accidental changes.

For unattended use, open **Presentation settings → Booth mode / export**. Choose audience interactions, a return loop, an idle timeout and a presenter passphrase. Booth locks persist across refresh in the same browser. A dedicated Booth ZIP omits the editor, private notes, recovery data and unselected slides. Use a restricted OS/browser kiosk for computer-level protection.

[Full editing and booth guide](docs/direct-editing-and-booth.md). Keep editable ZIP backups; older projects remain importable.

## Editor workspace

Navigate sectioned slide thumbnails, select content to reveal its inspector, and use Fit or 50–200% zoom with Space-drag panning for closer editing. Drag thumbnails to reorder within a section. Project-wide branding, booth and recovery controls are in **Project settings**. View changes do not modify saved slide layouts or presentation playback.

[Editor workspace guide](docs/editor-workspace.md).

Deployment milestone: see [Docker, GitHub Pages and Namecheap setup](docs/deployment.md) and [supported import formats](docs/import-compatibility.md). Maintainer acceptance is recorded; canonical release and downstream promotion remain separate verified steps. npm publishing is deferred.
