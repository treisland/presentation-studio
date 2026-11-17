# Milestone 34 testing candidate

Built from `v0.20.0-alpha.1`; this is a development candidate, not a new release.
Keep a separate editable ZIP backup of existing projects before testing.

## Main tasks

1. Insert Text and a shape, overlap them, and try selecting text, blank padding
   and the shape. Text keeps its existing direct editing; padding selects the block.
   Right-click the overlap → Select underneath. Keyboard users can use the selected
   object's actions menu or Layers. Focus each candidate to preview its outline.
2. Move each object slowly and quickly, then release while continuing to move the
   pointer. Check that the object stays at the released position. Repeat with an
   image frame, a group and an arrow endpoint. Try releasing beyond the canvas.
3. Click a grip without dragging. Press Escape during a drag; then Undo a completed
   drag. Expect no movement/history for a stationary click or cancellation, and
   exactly one Undo action per completed change.
4. Select several objects using Layers checkboxes. Inspector should say Multiple
   objects. In Arrange → Align & space choose Slide or Selection bounds, then
   align. Groups count once. Space evenly requires three independent units.
5. Insert each Library family, especially table cells, code, chart data, step
   numbers, navigation labels, and masked media. Confirm movement doesn't change
   their content, sequence, destination or crop. Text/table editing, Chart studio,
   group-member editing and media crop remain separate from moving the container.
6. Repeat at Fit/50%/100%, in a narrow window, light/dark and installed-browser
   200% zoom. Check small/rotated/overlapping objects and locked selections.
7. Export/reopen an editable ZIP in a clean profile and reopen playback/booth
   offline. Test recovery and a representative personal saved composition.

## Known limits and evidence

The dense-fixture release optimization is substantial but the aspirational 50 ms
budget is not met. See [measurements and inventory](canvas-reliability.md).
Report the build commit, browser/OS, zoom, object type, project size and exact
steps for remaining click-through or release lag. Avoid sharing private project
content when a neutral reproduction will do.

Maintainer usability testing, real browser zoom and screen-reader review remain
pending. CI and automated Chromium tests are separate evidence. Companion editor
imagery requires maintainer acceptance; no public site changes are included.
