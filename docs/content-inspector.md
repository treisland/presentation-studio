# Selection-driven Content inspector

The maintainer accepted this workflow on 2026-11-10 as part of the integrated 0.9.0-beta.1 build and confirmed the manual beta gates. See the [validation record](releases/0.9.0-beta.1-validation.md); the checklist below remains useful for subsequent changes.

The Library adds objects; the Inspector edits the selected object. Content, Arrange and Style remain the main Inspector tabs. The former Slide / Text / Tables / Commands / Notes / Media category row is retired from the interface.

Inspector sections now collapse independently using their headers (Enter/Space from the keyboard). Main editors start open; optional panel editors start collapsed. Expansion choices persist by selection type during the page session, while Slide notes keeps a shared preference. Changing objects of the same type retains the choices; explicit editing shortcuts reveal the destination. Collapsing preserves fields and pending values without adding an Undo step; existing blur rules can still finish an active edit. See the [control ownership and consolidation plan](inspector-navigation.md). Media Manager retirement and new context menus are separate v0.15.0 increments.

Select an element on the canvas or in the left Layers dock. Content shows that element's editing tools. **Find an element in Layers** provides a keyboard-reachable route when nothing is selected or objects overlap. Hidden and locked elements remain inspectable through Layers; editing still respects locks.

- **Slide settings:** use the header back-link to leave object inspection. Title, section and layout stay visible; Playback contains duration, transition and slide visibility. Presentation chrome visibility remains in its existing section.
- **Text:** edit on the canvas or expand **Edit in panel**. Plain-text replacement retains the warning about removing inline formatting. A template section containing several fields offers **Edit within this element**; this picker is scoped to the selected root and can reach its nested text, tables or code. It does not list unrelated cards or blocks.
- **Widgets:** selecting a widget retains its named fields. Multiple selection shows member inspection and shared actions rather than an unrelated text form.
- **Tables:** select a table to access its cell-editing alternative and existing structure commands. **Edit cells in panel** is initially collapsed. Row/column counts describe the selected table. Add row, add column, remove last column and individual row deletion remain available. Dimensions are not replaced with a destructive resize-on-input form.
- **Code / Commands:** shared snippet and optional language/environment labels stay visible. **Variants & defaults** contains named variants, initial choice and OS preference. Visibility is controlled through Layers. Snippets remain display/copy content, with no execution behavior.
- **Media and grid cells:** Media opens the selected object's Inspector without closing the editor. Choose media through Layers when several objects exist and nothing is selected. Media content owns Add/Replace, captions and alternative text; Placement owns layout, proportions, inset corner, border treatment and background overlay; Crop & shape owns one sizing choice plus relevant crop/frame controls. Video playback owns preview, autoplay, mute, loop, slide timing and posters. Additional/grid videos retain normal slide timing; the primary media controls slide advancement. The duplicate media list and Media Manager entry point are retired. See [parity and restoration](media-inspector.md).

The generic Content blocks, editable-text and table pickers are no longer shown in the main Inspector. The scoped nested-field picker preserves legacy template editing. **Legacy template content** retains the older flow-based paragraph/list insertion commands separately from movable Library objects; those commands are not exact equivalents and are not silently removed.

## Slide notes

The persistent **Slide notes** drawer belongs to the current slide, independently of object selection and the active Content/Arrange/Style tab. Opening it retains the selected object. Switching objects commits pending edits to their original target. Switching slides displays that slide's notes; selected-object locks do not lock unrelated slide notes, while slide/presentation locks and read-only mode do.

Notes remain in editable backups and recovery. Custom notes remain omitted from playback-only and booth output under the existing export rules. Drawer, disclosure and field-picker state are editor view state; saved formats and IDs do not change.

## Manual review

1. Use canvas and Layers to select text, a widget, two objects, tables, code, primary/background media and populated/empty grid cells. Confirm the old category row is absent and only relevant editors appear.
2. Choose different text fields inside a legacy template section. Type into the panel alternative and immediately switch fields or objects. Confirm the first edit stays with its original target and Undo restores it.
3. Open Slide notes while editing text. Verify selection remains, notes follow the slide, object locks permit slide notes and slide/read-only locks disable them. Save/restore an editable ZIP in a clean profile and verify offline/booth omission of custom notes.
4. Edit selected table cells and structure, Undo, then select another table. Edit code labels, variants/defaults and widget fields. No stale editor may change a different object.
5. Check light/dark, laptop/narrow layouts, actual 200% browser zoom, keyboard access and screen-reader announcements. Inspect footer scrolling with notes expanded. Automated Chromium results do not establish manual accessibility acceptance.
