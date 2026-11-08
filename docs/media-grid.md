# Media Grid

Add a **Media Grid** slide from the slide gallery. The inspector offers 2 × 2, 3 × 1 and 3 × 3 presets, or 1–3 rows and columns with 0–8% spacing. Select a named cell and use **Add media**, or drop one image/video on a cell. Existing slides and their content are not replaced.

Replacing populated cells names the target and previews the new file before confirmation. Use Fit or Fill/crop, move/swap cells, remove a cell's media, or keep it as a free object. Caption and alternative text use the existing Media inspector. Grid members use shared placement: detach before free positioning. A smaller grid asks to retain overflow media as free objects at their current positions; Cancel keeps the whole grid unchanged. IDs and assets survive preset changes and swaps.

Drag shared dividers at any canvas zoom, or Tab to a named divider and use arrow keys (Shift: larger increments). Each row/column retains at least 10% of the available area. Escape, lost pointer capture, blur or closing the editor cancels a drag; release is one atomic undo entry. Cell actions have names and selection state; arrows navigate cells. Keyboard users can perform all file, sizing, crop and swap actions in the inspector. Manual screen-reader and display-scaling review remains required.

## Persistence and compatibility review

This adds no project JSON field or schema version. One top-level safe AST `div.mg-grid` records row and column weights (integer units totaling 10000), spacing, stable `cell-*` IDs and references to existing `primary` / `object-*` media IDs using reserved class tokens. Each empty `div.mg-cell` has no executable content. Import validates cell count, bounds and unique IDs/references. Files, captions, playback settings, crop and normalized placement remain ordinary media assignments/mediaObjects, so existing asset discovery, history, checkpoints, recovery and offline ZIP exports apply.

Newer editors understand the reserved grid markup; older editors retain the positioned media but lack grid controls and may identify the template as Hero. Existing projects are unchanged and need no migration. Grid UI and empty zones are editor-only, never exported as audience controls. No remote service, raw CSS/HTML entry, dependency or file-format migration is introduced. Media limits remain 30 additional objects per slide; grids are bounded to nine cells.

The local editing contract accepts `grid.configure`, `grid.assign`, `grid.swap`, `grid.appearance`, `grid.remove` and `grid.detach`, with the existing revision, lock, atomicity and undo/checkpoint rules. Assignment accepts validated local asset paths; callers must supply the corresponding imported file bytes. Overflow requires explicit `overflow: "detach"`. Divider preview does not mutate the model, and active gestures reject concurrent batches.
