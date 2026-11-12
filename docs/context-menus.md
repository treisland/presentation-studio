# Library and object actions

Issue #190 adds contextual shortcuts for v0.15.0 on the Inspector/navigation foundation (#188) and consolidated media controls (#189). It adds no object capabilities, saved fields or services. Release preparation and manual release acceptance remain separate.

## Entry points and navigation

Every Library card has a visible **⋯** button. Right-click the card or focus it and press Shift+F10/Menu key for the same actions. The selected-item Inspector header has the same visible button for placed objects, groups, grid cells and slide settings. Right-clicking a placed object selects and highlights it first; targeting a member of an existing multiselection preserves that selection. Native text-entry menus remain available in inputs, textareas and selects, and in an active canvas text-editing session. An inactive table cell can expose row/column actions.

Menus use existing controls and transactions. They do not open a second editor. Edit/configuration/crop commands reveal and focus the relevant Inspector section. Placement choices use the existing media-placement operation. Move/swap cell media opens the destination controls rather than executing an old destination choice.

Arrow Up/Down navigate enabled items; Home/End reach the ends. Enter/Space activates. Arrow Right opens a submenu; Arrow Left or Back returns to its parent action. Escape closes and restores a visible origin without leaving group-member editing or closing the editor. Tab dismisses the menu and resumes normal focus navigation. Outside clicks dismiss; resizing keeps the menu within the viewport. Visible buttons and touch-sized menu rows provide access without right-click or hover.

## Catalog versus placed objects

| Context | Available existing actions |
| --- | --- |
| Built-in Library card | Its existing Insert command, using the current table/code/card settings. Unsupported preview or management capabilities are not invented. |
| Saved-component card | Insert, Rename saved component, Duplicate saved component, Export library, Delete saved component. Export library exports the library, not one preset. |
| Placed text, shape, annotation, widget, table, code or button | Relevant editing/configuration/action shortcut, supported Duplicate/Arrange/Hide/Lock/Rename/Save as component actions, and Delete from slide. Unsupported mutations retain disabled states. |
| Image/video | Replace media, Crop / adjust frame and Placement, plus applicable common actions. |
| Grid cell | Existing add/replace, crop, move/swap destination controls, detach and explicitly scoped removal. Parent/grid/object locks remain authoritative. |
| Table cell | Existing row/column actions for the targeted cell, retaining table limits, rich content and Undo guards. |
| Group/multiselection | Shared atomic actions and existing group/member navigation. A single-object editor is not applied silently across a mixed selection. |

The older saved-card Options menu is retired. Rename reveals its existing inline form; saved-item management uses the card's shared actions menu. Manage library remains the home for import/export/recovery, with an Export library shortcut in a saved-card menu. Deleting a saved original does not delete placed copies; editing a placed copy does not change its saved original.

## Targeting and safety

Pending Inspector fields finish against their original target before another object is selected. Menus capture project, slide, revision and selection identity. If those change before activation, the menu dismisses with a request to reopen actions; it never applies to a replacement target. Catalog re-rendering dismisses stale menus. Active canvas gestures do not open another action menu. Existing locks, read-only/booth restrictions, confirmation behavior, Undo, recovery and offline exports stay authoritative.

## Verification

Automated browser workflows cover all built-in card categories, catalog insertion with current values, saved-item management and independent copies, right-click targeting and multiselection, shared Undo, locked/stale actions, keyboard submenus and focus return, native text fields, pending edits, widget/code/button/table/media commands, groups and touch-sized targets. Run `npm run check`, `npm run package` and `git diff --check`.

Manual review remains for NVDA/screen-reader menu announcements, physical mouse/Menu-key/touch behavior, actual browser zoom, light/dark and narrow layouts, real media and downloaded offline editable/playback/booth reopening. Automated Chromium is distinct from manual release evidence.
