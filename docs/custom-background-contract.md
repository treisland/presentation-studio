# Custom background contract — proposed for v0.16.0

Issue #212. Implementation is assigned, but the format guard below needs explicit
maintainer review before the new persistent fields are implemented. This document
is a concrete proposal, not a claim that custom backgrounds are already available.
The supplied mock-ups guide scope indicators, readable previews and staged actions;
their incidental photographs, labels and layout are not bundled application assets.

## Inheritance and authoring

One Background surface has Presentation and This slide scopes, with Theme, Solid,
Gradient and Image modes. An absent slide override inherits the complete resolved
presentation configuration. A slide override replaces the complete configuration;
fields do not merge independently. Start from presentation background copies the
resolved configuration into a staged slide override. Reset removes that override.
New slides inherit; duplication deep-copies any override but can share immutable
original asset bytes. Editing the copy cannot change the original configuration.

Presentation changes preserve explicit overrides by default. Bulk application to
selected slides or a section is an explicit override operation, with target names,
counts, and preserve/replace choice shown before Apply. Reset all is separately
confirmed. Apply uses one existing revision-checked Undo transaction; Cancel writes
nothing. Reject stale or deleted targets and reject the entire commit if any target
is locked. Presentation-wide changes also respect project and slide locks.

## Layers and legacy appearance

Order from back to front: theme base/fallback; custom solid/gradient/image layer;
readability overlay; existing decorative effects/grid/orb; existing background media;
ordinary slide content; header/footer chrome. Background media retains its current
geometry, playback behavior and place in the media model. It can cover a custom
background; show this coexistence warning and offer explicit inspection rather than
moving, converting or deleting media. Decorative effects retain their own settings.

Decorations visibility hides decorative effects/grid/orb, not the base background
needed for readable text. Theme mode follows the active light/dark theme. Explicit
colors remain explicit through theme changes. Theme-linked color tokens resolve
from the existing bounded palette; arbitrary CSS is never accepted. Transparent
images and Fit letterboxing use the selected fallback color. Fill crops according
to bounded horizontal/vertical focal coordinates. No image is fetched remotely.

Protect text area adds a fixed directional readability gradient to the image layer;
it does not inspect/rewrite text or promise WCAG contrast automatically. A bounded
overlay color and opacity remain visible controls. Preview title/content/divider
slides with actual content before applying a coordinated look. Built-in looks use
original local vector/gradient artwork; uploaded originals remain unmodified.

No new metadata is created by simply opening an old file. Existing slide colors,
background media and background effects render exactly as before until an explicit
custom-background operation. Theme mode/reset does not silently erase legacy data.

## Proposed guarded metadata

Native `state.backgrounds` is optional, versioned declarative data:

```json
{
  "version": 1,
  "defaults": {"kind":"image","asset":"assets/background.png","fit":"fill",
    "focal":{"x":0.5,"y":0.5},"fallback":"#10203a",
    "overlay":{"color":"#10203a","opacity":0.45},"protectText":"left"},
  "slides": {}
}
```

Kinds are theme/solid/gradient/image. Solid has a validated hex color or palette
token. Gradient has exactly two validated colors, a finite 0–360 angle and no
executable content. Image paths pass the existing safe archive-path validator;
assets must be local supported image bytes, with existing upload limits. Focal
coordinates and opacity are finite 0–1, fit is fill/fit, protectText is off/left/right.
Unknown keys, kinds, versions, invalid values and unsafe paths reject the import
without modifying the active project. Non-image kinds cannot retain image fields.

**Proposed decision: native format v4 only when backgrounds metadata exists anywhere
in the project or recoverable history.** v1/v2/v3 imports remain supported. Untouched
projects keep their existing generation. v4 is needed because v0.15 understands v3
but would discard unknown background fields; a v4 guard makes older editors refuse
the project instead of silently losing appearance. Do not offer automatic lossy
downgrade. Self-contained playback HTML still presents using its embedded runtime.

Validate active state, Undo/Redo, checkpoints, Trash, section Trash and starting
state consistently. Keep every referenced original image reachable through the
existing asset collector, editable ZIP export, import and browser recovery. Removing
an image from the active slide must not purge bytes still referenced by recovery.
Playback/booth exports include only visible presentation content and required assets,
with no private notes, authoring history or discarded recovery state.

Portable authoring v1 must not gain fields that an old importer silently ignores.
Propose a separately guarded portable-authoring v2 only for new background-aware
documents, retaining v1 import and unchanged v1 examples. Publish schema/catalog and
original examples with the implementation; validate before preview/import. This
second format change is part of the same requested compatibility review.

## Acceptance examples and dependencies

| Case | Expected result |
| --- | --- |
| Existing v2 deck without new metadata | Same appearance and v2 export |
| Existing v3 effects deck | Same appearance and v3 export |
| New image default, one solid override | Default affects inherited slides; override stays solid |
| Duplicate overridden slide | Independent settings, original image bytes preserved |
| Change default while preview open | Stale Apply rejected; refresh review |
| Bulk target includes locked slide | No partial application |
| Image removed but referenced by Undo | Editable backup retains original bytes |
| Missing image on import | Actionable validation error; active work retained |
| Open v4 in v0.15 editor | Explicit unsupported-format rejection |
| Playback or booth offline reopen | Same resolved backgrounds; no private state |

#213 implements the approved metadata/authoring/rendering contract. #214 adds
readability/coordinated looks; #216 adds representative preview and bulk operations;
#217 verifies legacy, recovery, offline, accessibility and performance acceptance.
Full check/package/diff and recorded manual browser/screen-reader/actual media review
remain required. No external service, new dependency, executable background, remote
image generation, publication or version selection is authorized by this proposal.
