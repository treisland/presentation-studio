# v0.12.0 — Background effects milestone plan

Status: planning only, authorized by the maintainer's request to assign [milestone 12](https://github.com/treisland/presentation-studio/milestone/12) to v0.12.0. No delivery date is assigned. [Issue #149](https://github.com/treisland/presentation-studio/issues/149) tracks this plan. Implementation candidates are not agent-ready; assigning the milestone does not authorize runtime work, an application version bump or publication.

## User outcome

Give presentations a distinctive, consistent visual identity through restrained background effects that remain readable, easy to configure and portable. Users choose an effect rather than write animation code. Theme colors and typography remain independent from the effect's composition and motion.

The existing orb becomes a supported starting point. Presentations without new settings retain their current appearance and behavior until the user explicitly changes them.

## Initial scope

| Preset | Visual direction | Motion direction |
| --- | --- | --- |
| Orbit | Existing concentric rings and accent dot | Slow orbital movement |
| Aurora | Soft translucent theme-colored light gradients | Gentle drifting |
| Waves | Fine lines or translucent ribbons | Continuous flowing motion |
| Constellation | Sparse points and connecting lines | Restrained point/connection movement |
| Geometric Drift | Translucent or outlined simple shapes | Slow floating movement |

The generated concept sheet shows representative static frames, not final animations, measured performance or a renderer specification. Motion design and control bounds require review during the contract/rendering work.

Provide separate **None**, **Static** and **Animated** states. None removes the effect; Static retains a representative composition of the chosen effect; Animated enables motion subject to viewer preferences. Keep background fill/image and grid/decorations independently controllable. A slide's **Use presentation default** state must remain distinct from its explicit None override.

## Configuration and theme behavior

- **Project settings → Background:** choose presentation-wide defaults.
- **Inspector → Slide → Background:** inherit the defaults or apply a slide override, with a clear reset action.
- Offer effect-appropriate intensity, speed, scale and placement controls. Start with Full slide, Left, Right and Corners; review whether advanced positioning is necessary rather than duplicating Arrange controls.
- Use semantic theme roles such as background, accent, secondary and muted. Adapt brightness, opacity and blending for light/dark themes; a custom palette must remain usable.
- Explicit custom colors survive theme changes; theme-linked slots update with the theme. Reset-to-theme reconnects only the affected override.
- Preserve quiet space for content. Review contrast over the complete motion cycle, not just the gallery frame. Conservative defaults must work with dense slides as well as title slides.

Configuration changes must use existing selection/lock, Undo/Redo and recovery conventions. Backgrounds remain behind content, outside ordinary object selection, and never consume content-editing pointer or keyboard gestures.

## Motion and lifecycle

Editor views and navigator thumbnails use static representative frames by default. An explicit motion preview shows animation without restarting thumbnail updates during editing. Keep preview state out of saved projects and Undo history.

Honor reduced-motion preferences with static equivalents and provide an accessible viewer motion-off control. Viewer overrides are session-only and do not rewrite the authored presentation. Avoid flashing or abrupt movement; static alternatives should remain intentional designs.

Slides sharing the same resolved effect/settings should retain continuity. Define transitions or reset behavior when the effect/settings differ. Pause inactive/hidden instances and clean up animation resources after project switches, previews and exports. Agree measurable target-device complexity/performance budgets before implementation readiness; prefer a simpler rendering fallback to content becoming unresponsive.

## Compatibility, security and portability gates

Define the persistent settings contract before implementation. Do not assume a schema bump or that older editors will understand new fields. Specify missing settings, unknown effect IDs/options, future formats, older-reader behavior and an explicit migration/fallback strategy. Unsupported inputs must not silently discard content. Any breaking format change requires maintainer review under [the release process](release-process.md) and [import policy](import-compatibility.md).

Use built-in rendering and validated, bounded settings. Arbitrary JavaScript, CSS or shader uploads, executable preset packages, external animation services and automatic remote asset fetching are outside scope.

Editable ZIPs and browser recovery must preserve supported settings, IDs, media/history and independent project identity. Playback and independent booth exports must bundle the required rendering and static fallbacks, retain motion controls and exclude private authoring/recovery data. Rendering must work offline; format support and visual fallbacks require explicit tests rather than assumptions.

Portable AI authoring should expose approved effect IDs and supported options through the generated schema/capability catalog. LLMs select validated presets; they do not invent runtime code. Retain staged validation/review and safe handling of unsupported fields.

## Delivery work and dependencies

| Candidate | Deliverable | Depends on |
| --- | --- | --- |
| [#150](https://github.com/treisland/presentation-studio/issues/150) | Settings, theme inheritance, option bounds and compatibility/security contract | Separate v0.12.0 design/readiness approval |
| [#151](https://github.com/treisland/presentation-studio/issues/151) | Five native presets, static frames and lifecycle/performance design | #150 |
| [#152](https://github.com/treisland/presentation-studio/issues/152) | Project/slide controls, inheritance, accessible motion preview and viewer override | #150, #151 |
| [#153](https://github.com/treisland/presentation-studio/issues/153) | Editable/playback/booth portability and validated AI capability exposure | #150, #151; coordinate with #152 |
| [#154](https://github.com/treisland/presentation-studio/issues/154) | Readability, accessibility, performance and compatibility acceptance | #150–#153 |

Design validation should inform every stage; final acceptance is not a substitute for early tests. Keep implementation PRs scoped and separately assigned. The target feature milestone is v0.12.0. Exact prerelease/stable progression, application version changes, release preparation and publication authority remain separate later decisions.

## Acceptance matrix

1. Exercise every effect with light/dark themes and custom/extreme palettes; verify inherited and explicit color behavior, slide defaults, None/Static/Animated states, reset and Undo/Redo.
2. Review title slides, dense text, tables/code, images and simultaneous video for readability throughout motion. Define and measure performance budgets on supported target devices; record hardware, environment, build and results.
3. Test keyboard/screen-reader names, states, focus and motion controls; reduced-motion preferences; viewer motion-off; inactive-instance cleanup; continuity and explicit preview cancellation.
4. Verify stable editor/thumbnails, content selection/dragging, legacy orb appearance, project switches and repeated preview/open/close cycles.
5. Restore complete editable ZIPs in a clean profile and reopen playback/booth exports offline. Confirm identities, media/history, matching appearance and omission of private data. Test the agreed older-reader and unknown-format behavior.
6. Validate AI-generated settings and malformed/unsupported options without modifying active work. Confirm generated instructions/catalog agree with implemented controls.
7. Record actual supported browser/OS and real video/OBS evidence where support is claimed. Automated checks and earlier release sign-offs do not establish new manual motion acceptance. Follow all existing protected CI, artifact and manual release gates.

## Deferred work

Saved personal effect presets and their management/import/export UX; arbitrary executable uploads; custom shaders/CSS; interactive or pointer-reactive backgrounds; external effect services; new canvas formats; and unrelated AI/provider, filesystem or collaboration work remain outside the initial milestone. No dependency, service, project-format change or publication is approved by this document.
