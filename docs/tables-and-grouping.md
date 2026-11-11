# Tables and Library manipulation — 0.11.0

Approved scope is [issue #135](https://github.com/treisland/presentation-studio/issues/135) in [milestone 0.11.0](https://github.com/treisland/presentation-studio/milestone/11). This improves existing Library items; it does not add spreadsheet formulas, merged-cell authoring, CSV import, status badges, nested groups or new navigation.

## Tables

Insert from **Add / Library → Data & Code**. Click a cell to select its row and column and edit text directly. The canvas action bar offers row insertion above/below and column insertion left/right, plus deletion of the selected row or column. Header cells insert data rows below the header. At least one row and one column must remain; limits are 30 data rows and 12 columns. Merged or irregular imported tables retain their content and styling but structure controls are unavailable until a supported rectangular table is used.

Inspector **Content** retains the optional **Edit cells in panel** disclosure. Panel fields replace that cell's text and finish the previous inline session while retaining the selected table and panel focus. The canvas updates after the edit flushes; returning to a canvas cell continues from the panel value. Structural edits preserve other cells' rich text, links, classes, attributes and row containers. Locked tables, slides and presentations reject changes. Undo restores a whole structural or style operation.

Existing template tables support the same cell actions without converting them to free blocks. Focus can move from a canvas cell to the table action bar or table Inspector controls without dismissing the selected table; choosing another object or slide changes the editing context normally.

Inspector **Style** offers Plain, Header, Banded and Grid presets; a semantic header toggle; separate header/body fill, text color and alignment; header weight; alternating row colors; borders; and compact, comfortable or spacious padding. Theme colors stay connected to the presentation theme. Choosing a custom color overrides only that slot. Reset table style removes the new overrides and restores the table's existing styling. Turning the header on promotes the first data row; turning it off returns that row to the body, preserving its content.

An overflow notice recommends enlarging the frame or reducing spacing instead of silently shrinking content. Table blocks retain ordinary Arrange movement, resizing, duplication, visibility and removal.

## Canvas selection and groups

- Shift+click adds or removes an object from the current selection. Within an active text editor, ordinary text selection remains available.
- Drag from empty canvas to draw a selection rectangle. Only fully enclosed eligible objects are selected; groups are selected only when every member is enclosed. Hidden and locked objects are excluded. Space+drag still pans.
- Choose **Group** or Ctrl/Cmd+G when at least two ungrouped free blocks or floating media are selected. Template content needs Customize position first. Unsupported selections explain why grouping is unavailable.
- Click a grouped item to select its group. A shared bounding box provides Move and proportional Resize handles; arrow keys work on those handles. Group actions preserve members' relative positions and existing names, styles and stacking order.
- Choose **Edit group** or double-click a member to enter the group. Select and edit individual members; Escape returns to the group after text editing is finished. Nested groups remain unsupported.
- Choose **Ungroup** or Ctrl/Cmd+Shift+G. Released members stay in place and remain selected. Undo restores the group. Ungrouping a hidden group keeps its members hidden.
- Layers shows named group headers and indented member rows, synchronized with canvas selections. Existing layer checkboxes remain a keyboard-accessible selection alternative.

Selection rectangles, editing context, shared handles and Inspector state are session-only. They never enter project JSON or exports. New table styles use safe class tokens and the existing AST, preserving native project v2 and library v1. Earlier editors can retain content but do not offer these new controls; older playback builds may not understand new table styles. Use exports produced by the current version for matching rendering. Editable ZIP, playback and independent booth exports must retain table appearance. Saved components insert independent copies with fresh IDs.

## Validation and release

Automated coverage exercises headerless tables, rich-text-preserving structure edits, lock rejection, Undo, theme/custom styling, Library copies and editable ZIP restore; Shift+click toggles, marquee selection, group shortcuts, movement, editing and released selection. Run `npm run check`, `npm run package` and `git diff --check`; both protected Windows/Linux checks must pass.

Manual review checklist:

1. On laptop and desktop sizes in light/dark editor themes, insert and edit a table, navigate between cells and use the row/column actions. Check focus and accessible labels, especially after deletion.
2. Toggle the header twice, test long cell content and all style presets, then change the presentation theme. Confirm no unintended movement and no horizontal scrolling in Inspector controls.
3. Use Shift+click, drag selection, keyboard Group/Ungroup, Layers selection, shared move/resize, group member editing and Undo/Redo. Confirm locked/hidden objects and text-selection/pan gestures remain predictable.
4. Save a styled table or group as a personal component, insert an independent copy, export/import the Library, and restore an editable ZIP in a clean profile. Reopen playback and booth ZIPs offline and confirm styling and geometry.
5. Record actual supported browser/OS, keyboard/screen-reader review and real delivery-video/OBS evidence required by [the release process](release-process.md). CI is separate from these manual results.

The maintainer pre-approved beta sign-off conditional on passing CI on 2026-11-11 (America/Denver). This authorizes preparing the beta without another general approval request, but does not assert unperformed manual checks passed. A separate release-preparation PR records actual evidence and the beta plan; release protections and artifact gates remain unchanged.
