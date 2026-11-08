# Editor workspace

For multiple images/videos in adjustable cells, see [Media Grid](media-grid.md).

The editor uses three areas: sectioned slide thumbnails on the left, the editing canvas in the center, and a contextual inspector on the right. These changes do not introduce a new presentation format.

## Select and edit

Use **Add block** for freely positioned text, shapes and callouts; the inspector's **Content blocks** list provides selection and keyboard arrangement. See [content blocks](content-blocks.md) for placement, snapping, layers and compatibility details.

Click text to edit it directly, or select a media frame or table cell. The inspector follows the selection:

- **Slide:** section, layout, duration, transition, visibility and block editor. Click the empty canvas or the Slide tab to return here.
- **Text:** the existing formatting toolbar and block editor, plus block font size in pixels. Font size uses the existing safe style representation and is undoable.
- **Media:** replacement, placement grid, free positioning, crop, layers, caption, alternative text and visibility. The old Media Manager remains available for advanced primary-media settings.
- **Tables:** row/column and cell controls.
- **Commands:** displayed command variants; these are never executed.
- **Notes:** presenter notes.

The selection header and Duplicate/Delete actions stay visible above **Content**, **Arrange** and **Style** tabs. Content holds text/table/commands/notes and media file/caption fields; Arrange holds geometry, alignment, layers, grid presets/dividers and design locks; Style holds text formatting and media fit/crop/visibility. Context tools remain in Content. Use arrows/Home/End within the section tablist. The active tab persists for the editing session, including selection changes.

Deletion names identify the target: Delete block, Remove media, Remove media from cell or Delete slide. Locked/read-only selections disable destructive actions; Undo restores changes. Grid cells use removal/swap rather than duplicating into an occupied cell. Slide duplication retains primary and additional/grid media in one undo step.

Directional chevrons sit on the inner edge of Slides and Inspector. Collapse left/right respectively; their narrow labeled rails remain visible to reveal either panel. Tooltips, accessible names and expanded state describe each action. Panel widths, collapse and section tabs are view-only session preferences and do not enter saved projects or history.

Slides search/Add slide stay above the independently scrolling thumbnail list. Thumbnail actions appear on hover or keyboard focus and retain locks. Existing section collapse and selected-slide indicators remain available. Project settings stay in their separate dialog.

The additive **Layers** tab and Style swatches are described in [Styling and precision](styling-and-precision.md). Layers selects/orders/names/hides/locks objects; check boxes batch appearance changes. **Add slide → Blank**, Clear selected objects and confirmed Clear slide contents support a fresh layout while retaining identity and recovery.

## Project settings

**Project settings** in the editor header opens a separate dialog containing Branding, Presentation settings, Sections, Kiosk loops and Recovery & reset. It retains the existing theme gallery, presets, logos, transitions, booth controls and recovery actions. **Back to canvas** or Escape while inside that dialog closes it without closing the editor. The title bar and slide navigation remain available while settings are open.

## Thumbnails and ordering

Thumbnails use the current rendered slide and theme, including media placement. They are inert, load only as they approach the visible sidebar, contain no interactive controls and never play videos; videos use a poster or static Video placeholder. Slide titles remain searchable, and badges indicate individually hidden or locked slides.

Use section headings to collapse or expand groups. Search temporarily expands matching groups. Drag an unlocked thumbnail onto another thumbnail to reorder within the same section. Drop in the top half to insert before, or the bottom half to insert after. One reorder is one undo step. Clear text search before dragging so hidden neighbors do not make ordering ambiguous. Existing up/down buttons are the keyboard alternative. Move a slide to another section through its Section field; cross-section thumbnail drops are refused.

Custom kiosk loops keep their intentional order. As with the previous move buttons, a loop keyed to that section follows the section order. Presentation and slide locks prevent protected drag reordering.

## Zoom and pan

- Toggle **Slides** or **Inspector** above the canvas to give it more room. **Panel sizes** offers width sliders: drag them or use arrow/Home/End keys while focused. Widths are preferred sizes and adapt to the available screen width; **Reset panels** restores both panels and default widths. Escape closes the size controls without closing the editor.
- Fit automatically follows panel collapse, width changes and window resizing. A manually selected zoom remains selected across these changes; click **Fit** to return to the complete-slide view. Panel state lasts only for this page session and never enters projects, exports or undo history.

- **Fit** shows the complete slide in the available viewport; the readout shows the actual fit percentage.
- Choose **50–200%** or use plus/minus for closer editing.
- Focus the canvas, hold **Space**, and drag to pan. Middle-mouse dragging also pans.
- Ctrl/Cmd + mouse wheel zooms around the pointer. With the canvas focused, Ctrl/Cmd + plus/minus zooms and Ctrl/Cmd + 0 returns to Fit.
- Escape during a pan cancels that view movement. Releasing the pointer commits only the view position, not an undo entry.
- Typing spaces in editable text and form controls continues to work normally. Media Focus and video controls keep their keyboard behavior.
- Selecting a different slide resets the view to Fit. Entering interactive Preview also fits the whole slide so presentation controls remain reachable. Resizing the window recalculates Fit.

Zoom, pan, selection and section folding are transient editor view state. They are not stored in project JSON, undo history, playback packages or booth exports, and they never change the actual presentation stage. Media dragging and resizing continue to use normalized slide coordinates at any zoom level.

## Compatibility

Older editable ZIPs and JSON files open through the same validator, preserving content, themes, media, notes, locks and reset baselines. Exports keep their existing schema. There is no migration or automatic layout conversion for this workspace enhancement.
