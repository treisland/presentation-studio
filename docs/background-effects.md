# Background effects — v0.12.0

Scope: [milestone 12](https://github.com/treisland/presentation-studio/milestone/12), work items #150–#154 and implementation [#158](https://github.com/treisland/presentation-studio/issues/158). The maintainer authorized implementation and conditional beta sign-off after passing tests, and separately approved guarded native schema v3. Publication still follows [release preparation and evidence gates](release-process.md).

## Choose a background

Open **Project settings → Background**. Choose a visual preset, then **Apply background**. Controls stage an independent preview until Apply; changes are one Undo step. **Restore original orb** removes the presentation override while preserving any slide overrides.

For one slide, open **Slide settings → Content → Background** in the Inspector. **Use presentation default** removes the slide override; **Slide override** replaces the complete inherited effect configuration. Newly added slides inherit the defaults. Duplicating a slide copies its explicit override independently. Slide/presentation locks reject protected changes.

| Preset | Appearance |
| --- | --- |
| Orbit | Concentric rings and a moving accent dot |
| Aurora | Soft, drifting translucent gradients |
| Waves | Flowing curved lines |
| Constellation | Sparse points and connecting lines |
| Geometric Drift | Slowly floating simple shapes |
| None | Remove the effect while retaining the independent slide background |

**Static** retains a representative composition of the chosen effect. **Animated** enables motion when the viewer's motion settings permit it. None and Static are separate choices. Placement supports Right, Left, Full slide and Corners.

## Theme colors and readability

Colors follow the presentation's accent, secondary, muted or background role. The effect uses the actual preview/playback palette and adjusts intensity for dark backgrounds. Choose Custom for a slot to retain a six-digit hex color across theme changes; **Reset to theme** reconnects that slot. Effect selection does not replace theme typography, fill, images, header or footer settings.

**Advanced appearance** includes intensity (0–100), cycle duration (10–120 seconds), scale (50–150%), standard/simpler rendering, a quiet content area, grid visibility and color slots. Grid visibility is independent of the effect. Existing Decorations visibility remains a master concealment setting.

Defaults are restrained. Custom palettes and high intensity can still reduce readability; review dense text, tables/code and video throughout motion, not only on a title slide. Backgrounds remain behind content, inert and excluded from content selection/dragging. No flashing or abrupt opacity jumps are designed into the animations.

## Motion and previews

Editor canvases, slide navigator cards, theme previews and AI import previews remain static. **Preview motion** animates only the explicit sample; closing the preview/settings, changing projects or hiding the page stops/pauses it. Only one settings preview runs at a time. Motion previews do not mutate the project or restart navigator refreshes during text editing.

Presentation **More → Pause background motion** changes only this viewing session. It does not rewrite saved settings. The independent booth player has the same motion choice. Reduced-motion preferences and the presentation's Disable motion setting take precedence; a static composition remains visible. Hidden pages pause rendering and resume only if permitted.

Matching resolved effect settings and colors reuse the same stage layer across slide changes. Different effects/settings restart at their deterministic representative phase; this release does not morph between unrelated effect types. No external assets, shaders, services or executable custom uploads are used.

## Native compatibility and recovery

Untouched projects continue exporting native schema v2. Effects use optional validated backgroundEffects metadata in native schema v3. The format guard includes current settings, Undo/Redo history, checkpoints and starting-state recovery; undoing an effect does not silently downgrade a file whose recoverable history still contains it.

Studio v0.12.0 imports native v2/v3 and retains the legacy v1 importer. Older editors reject v3 through their existing version guard, instead of opening and silently losing new settings. Do not edit the version number or ask an LLM to downgrade it. Preserve the original file and open an independent copy with a compatible Studio build. Unknown future native/effect formats, presets and option values are rejected before replacing active work.

Editable ZIP export/restore preserves identities, media, supported settings and recovery/history. Playback and independent booth ZIPs bundle the renderer and static fallbacks for offline use; omitted slides and private authoring/recovery content remain excluded. Their viewer motion controls are session-only. Browser recovery is separate from portable editable ZIP backups, and moving between beta/stable origins requires explicit backup/import.

## AI authoring

Portable authoring v1 accepts an optional background object at presentation and/or slide level. The generated schema and capability catalog list exact IDs, ranges, theme roles and options. A slide background object replaces the full presentation effect configuration for that slide; omit it to inherit. Use effect none or mode static explicitly. The instruction pack includes background-effects.json alongside the existing examples.

Validation and inert visual review remain required. Unknown fields, unsafe colors or unsupported presets do not become executable code. Effect-enabled imports create guarded native v3 projects with fresh authoring identities. Native projects are not converted back into portable authoring documents as a storage substitute.

## Acceptance and measured budgets

The initial structural budgets are one animated stage effect layer, no more than 24 decorative nodes per layer, zero animated navigator thumbnails and no effect-specific per-frame JavaScript/timer loop. Simpler rendering caps particle counts at six. Animation uses CSS transforms/opacity, and disconnected preview controllers are held only through weak references. The existing presentation/media player has its own independent playback loop.

Automated acceptance covers all presets; dark/light themes and explicit custom colors; inheritance, reset, None/static and independent grid behavior; duplication, locks and Undo; v2/v3 guards; clean-profile editable ZIP restore; native/AI invalid inputs; inert editor/thumbnails; reduced motion; a 50-slide bounded-layer/continuity scenario; and offline playback/independent booth colors and viewer controls. Full check/package results and exact environment are recorded in the PR/release evidence, not inferred from this checklist.

Manual acceptance must record the tested commit, actual browser/OS and target-device performance, keyboard/screen-reader workflow and real delivery-video/OBS results where support is claimed. Review 1080p playback with simultaneous video, dense text, custom/extreme palettes, narrow editor layouts and increased display scaling. Conditional CI sign-off is release authorization; it is not a claim that unperformed manual motion tests passed.

The five candidate work items are delivered as one integrated feature scope. Saved personal effect presets, interactive backgrounds, executable JS/CSS/shader uploads, new canvas formats and external effect services remain deferred.
