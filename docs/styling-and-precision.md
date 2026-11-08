# 0.4.0 — Styling and precision

Assigned scope: [#57](https://github.com/treisland/presentation-studio/issues/57), [0.4.0 milestone](https://github.com/treisland/presentation-studio/milestone/5). AI moves to 0.5.0; MCP moves to 0.6.0. This implementation does not bump the version or authorize publication. The maintainer reviews the development build before separate release preparation.

## Appearance

Select a block/content root or media, then open **Style**. Choose Text, Fill or Border; select the slide context for Slide background. Theme swatches store semantic roles and follow theme/appearance changes. Custom six-digit hex values remain fixed. Opacity is 0–100%; Transparent is explicit, while Inherit removes the override. Border width is 0–24 pixels. Solid-color text contrast is an estimate; images and transparency can change the actual contrast.

Name and save up to 24 project colors. Use Accent, Outline or Quiet presets, or Copy/Paste appearance. These controls style the selected content object, rather than a partial character range. Existing Bold/Italic controls remain available for inline selections.

The native Color picker and Custom hex field stay synchronized. The picker opens at the selected custom or theme color; opacity remains a separate control. Pick or type a color, then choose Apply custom to commit one Undo step. Draft picker/hex changes do not alter the project. Invalid or incomplete hex values are marked and cannot be applied.

Use check boxes in Layers to apply appearance to several objects in one Undo step; differing values display Mixed. A batch containing a locked object is rejected atomically. Gradients, shadows, recent-color UI and palette import remain outside this milestone.

## Blank and clear

**Add slide → Blank** creates an empty slide that uses the presentation theme. No placeholder content is injected. **Clear selected objects** removes the selected Layers entries; **Clear slide contents…** confirms removal of all content/media. Clearing retains slide ID, section membership, presentation settings and slide background. Locked objects/slide/read-only mode prevent destructive changes. Undo/history preserve removed content and media references for recovery.

## Layers

Layers lists frontmost first. Select a row to synchronize the canvas/Inspector; hidden and locked objects remain inspectable. Names are separate from visible content. Hide/Show and Lock/Unlock are explicit row controls. Drag to another row to reorder or use forward/back buttons and Alt+Up/Down. One action is one Undo step; locked objects prevent stack changes that would affect them. Background media stays below content.

Grid media remains nested under its Grid; cell buttons select cells without exposing independent stack reordering. Use Grid swap/detach controls for cell rearrangement. Hide/order the Grid as a group; detach media for individual free rotation. Grouping and nested free groups are deferred.

## Precision

Arrange retains normalized X/Y/W/H fields for free blocks/media and adds -180–180 degree rotation for independent objects. The Snap check box is a session preference. Moving objects snap within six screen pixels to slide/object edges and centers, or an equal-space midpoint between objects. Alt temporarily bypasses snapping; hidden/locked objects are excluded as references. Guides are transient, disappear on commit/cancel and do not enter project data. Existing keyboard nudges and numeric placement remain available.

## Compatibility and architecture

Optional `state.design` stores a bounded project palette and per-slide appearance/layer metadata. Content roots receive stable `layer-*` class IDs only when first edited; existing free-block and media IDs are reused. Safe validated colors generate CSS at render time; no arbitrary CSS/URLs are accepted. No schemaVersion change or migration is required, and projects without design overrides retain their original state/rendering. Use a current build to retain new design metadata when re-exporting; older builds do not understand these optional features.

Design operations use the shared versioned editing API, revision checks, locks, checkpoints and atomic history. Names, styles, rotation, visibility and stack order survive editable/playback ZIP reopening. Background and Grid stack rules are consistent in the editor and player. Playback excludes design records for omitted/trash slides.

Validation includes existing legacy/media/recovery workflows and focused appearance, layer, blank/clear, theme-change, zoom-snapping and offline ZIP tests. See [manual review steps](0.4.0-manual-test-plan.md).
