# Freely placed content blocks

Choose **Add block** above the canvas for Text, Rectangle, Circle or Callout. Media opens the existing additive uploader. Existing slide layouts are not converted. New content uses the slide's theme, and text inside each block remains editable using the normal text tools. Timers/counters and Media Grid are separate work.

Select blocks from **Content blocks** in the inspector, including overlapping blocks. Drag **Move** or the bottom-right resize handle. Movement snaps to edges, margins and center; resize dimensions snap near 5% increments. Hold Alt to bypass snapping. Escape, pointer cancellation, capture loss or window blur cancels a drag without an undo entry. The preview changes during the gesture; model placement commits once on release.

Keyboard users can add with Enter, select from the block list, set Left/Top/Width/Height percentages and Layer, choose alignment, duplicate or remove. Focus a block or Move handle and use arrows to nudge; Shift moves faster. Focus the Resize handle and use arrows to change dimensions; focus stays on that handle for repeated keys. Escape closes the palette. Each action is undoable, and API batches retain a pre-change recovery checkpoint. Project and slide locks apply to block changes.

## Representation and compatibility

Blocks reuse schema-v2 safe content-tree nodes. A reserved `db-block` class and `block-…` class token identify each top-level block within its slide. Existing slide, section and media IDs remain unchanged. Placement uses bounded percentage left/top/width/height, static absolute positioning and integer layers 0–40 in the existing style field. Imports validate coordinates and duplicate/missing block IDs. No raw HTML, URLs, arbitrary CSS properties or new project fields are introduced.

Blocks render as direct children of the slide, outside media's original-content pane, so media layouts do not change coordinate scale. Render-only drag handles are absent from playback and do not enter project JSON. Existing projects need no migration. Current editable exports preserve placement and undo/checkpoints, and playback retains rendering offline. Older Studio versions may strip the newly supported positioning styles when importing these new blocks; use this version or newer to edit free placement. This does not change existing projects' behavior or promise forward compatibility with older editors.

The local editing API v1 adds `block.create` (kind, optional blockId/placement/layer), `block.place` (blockId, placement, optional layer), `block.duplicate` and `block.remove`, all with slideId. Only palette blocks are addressed; original layout nodes cannot be moved/deleted through these operations. Maximum 60 free blocks per slide. Created IDs are returned in `created`; duplicate assigns a new ID. Same revision, BUSY, lock, atomicity and cancellation rules apply. Batches reject while a pointer block gesture is active. See [the editing contract](editing-api.md).

Manual screen-reader review, contrast with actual content and supported-browser/display evidence remain release-stage checks; automated keyboard/round-trip tests are not an accessibility certification.
