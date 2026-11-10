# 0.8.0 — Editor workbench and direct manipulation

Implemented through [#124](https://github.com/treisland/presentation-studio/issues/124) / PR #125. The maintainer accepted the integrated workbench and Inspector build on 2026-11-10 and authorized 0.9.0-beta.1 with confirmed manual gates. See the [beta validation record](releases/0.9.0-beta.1-validation.md). The design follows the approved concept: calm light/dark surfaces, a larger canvas, blue selection and primary actions, compact controls and clear positioning affordances.

## Editing workspace

- The app identity, document title and existing recovery/backup status appear in the top bar. Export downloads the existing complete editable ZIP; Present retains its existing behavior.
- Add / Library, contextual formatting, Arrange and Snap remain above the canvas. Snap and its Inspector checkbox share the same session preference. Alt bypasses snapping while dragging.
- On first use below 1200px the slide navigator starts collapsed and Inspector uses a narrower width; below 760px both panels start collapsed. Toggle either panel from its rail. Explicit panel choices persist for the session across resizing; on small screens opening a panel closes the other.
- Drag a rail separator to resize a panel, or focus it and use arrow keys (Shift for larger increments), Home or End. Escape cancels an active panel resize. Existing width sliders and Reset panels remain available under More.
- Inspector shows the current selection and retains Content, Arrange, Style and Layers with readable labels. Library categories have distinct selected states; Clear search is unavailable until there is a query. Dialog styling follows the editor theme.

## Move, resize and align

Select a free text block, shape, widget, Table or Code container to expose its move grip and resize handles. Drag the move grip to reposition; resize from an edge or corner. Snapping shows alignment/equal-spacing guides; hold Alt to move freely. Existing keyboard nudging, locks, group operations, Escape cancellation and one-step Undo remain authoritative.

Template content keeps its original layout on open. Select eligible template text, card or section and choose **Move / resize** to explicitly customize its position without a visual jump. Reset position to template restores its layout while retaining edited content. Templates are not silently detached on selection. Structured media/grid content keeps its specialized placement controls.

Editor layout, snap preference, theme tokens and panel geometry are not saved into presentation content. Project/slide/element IDs, old formats, media, recovery and offline exports retain existing behavior. Optional MCP/provider/folder work is outside this milestone.

## Manual acceptance

1. At 1440×960 and 1024×768, inspect light/dark workspace, title/status, selected objects, readable tabs and reachable actions. At 200% browser zoom and smaller widths, verify controls and panel toggles remain usable without page overflow.
2. Toggle, drag-resize and keyboard-resize panels; cancel with Escape and reset. Verify explicit choices remain after resizing the window and canvas zoom/pan still work.
3. Insert text, shapes, widgets, Table and Code. Move/resize from each edge/corner, nudge with the keyboard, inspect alignment and equal-spacing hints, bypass snapping with Alt, lock elements, cancel a drag and Undo each completed change.
4. Customize and reset existing template text/cards/sections, including long edited content. Check grouped objects and media retain their existing behavior.
5. Browse Library categories/search/empty states and AI import/review/repair. Check keyboard focus, screen reader names and dialogs in both themes.
6. Export a media/history editable ZIP, restore in a clean profile and verify offline playback and legacy imports. Verify component library transfer separately.

Automated regression coverage does not substitute for manual screen-reader, real browser zoom or final visual acceptance.
