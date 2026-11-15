# Inspector navigation and contextual actions

Milestone [v0.15.0](https://github.com/treisland/presentation-studio/milestone/16) is authorized for implementation. Initial disclosure work is #188; media parity is #189 and context menus are #190. Release preparation and manual acceptance remain separate.

## Navigation contract and control inventory

Each setting has one primary home. Shortcuts invoke the same action or reveal the same Inspector section. Library owns discovery, insertion and saved-item management. Layers owns placed-object discovery, selection and organization. Inspector owns detailed editing. Toolbar and context-menu entry points are shortcuts, not competing editors.

| Existing controls | Primary home and disposition |
| --- | --- |
| Slide content, text panel, widget fields, table and code editors | Selection-driven Inspector Content, retaining existing handlers in collapsible sections. |
| Appearance/color and position/size | Existing Style and Arrange navigation with collapsible sections. Color popovers remain focused sub-editors. |
| Media Manager and selected-media fields | Selected-media Inspector replaces the modal entry point. See [the #189 parity map](media-inspector.md) for primary/additional/grid media, layouts, captions, playback and posters. |
| Fit/crop, mask and grid sizing | One selection-aware Sizing choice in Crop & shape; only applicable legacy or framed crop controls are shown. |
| Change placement and free/structured placement | Compact Placement shortcuts and the selected object's Placement section share existing placement operations. |
| Media-object selector and Layers | Layers is the single object-selection home, including grid-cell children. The redundant media list is retired. |
| Project import/export in media editing | Project owns import/export. Advanced primary-only settings JSON explains its exclusions; editable ZIP remains the complete backup. |
| Hide, lock, duplicate, delete and reorder | Retain useful Layers/toolbar/menu shortcuts with identical handlers and guards. |
| Library cards and placed-instance menus | [Shared contextual shortcuts](context-menus.md) invoke existing actions and Inspector sections. Saved originals and placed copies remain independent; Delete saved component and Delete from slide are distinct. |

## Collapsible sections

Content, widget fields, table/code content, button actions, media frames, appearance and block position/size use native disclosures. Existing optional text editing, playback, background, table-cell fallback, code variants, media controls and notes participate in the same session preference mechanism. Primary sections initially remain open; existing optional editors initially remain collapsed. Multiple sections may stay open.

Click a header, or focus it and press Enter/Space, to toggle it. Collapsed primary headers show current selection context; media-frame headers summarize sizing and shape. Choices are remembered by selection type for this page session, including image vs video and free-block type. Notes keep one shared preference across types. Preferences are not saved in projects, recovery, component exports or Undo history. A reload starts with defaults.

Changing objects of the same type retains disclosure choices and does not deliberately reset Inspector scroll. Switching types restores that type's choices. Explicit edit/slide navigation and media crop shortcuts reveal their target section. Collapsing retains controls and pending values without a project transaction. Existing blur/commit rules still apply to an edit completed by clicking a header.

Content/Arrange/Style remains the single Inspector navigation strip. [Media parity](media-inspector.md) and [context menus](context-menus.md) have separate implementation issues and linked PRs. Control retirement follows the ownership/parity map above rather than disclosure wrapping alone.

## Validation

Automated coverage exercises keyboard disclosure, independent expansion, per-type restoration including rebuilt widget forms, unchanged project/revision after view-only interactions, pending text, table/notes selection, explicit navigation and existing recovery/export workflows. Run `npm run check`, `npm run package` and `git diff --check`.

Manual review remains required for theme contrast, laptop/narrow-panel layouts, screen-reader announcements, real media and offline downloaded-package workflows. Automated Chromium checks do not establish those manual results.

## Text Inspector simplification (#200)

Text fields appear directly inside a single Text disclosure; there is no nested Edit in panel step. Edit on canvas retains the existing inline workflow. Replacing text in the panel removes inline formatting, as the short adjacent note states. Selection blockers remain before the controls, while keyboard/positioning help follows notes. Controls, notes and help share the main Inspector content scroller; the selection header and tabs remain above it. Disclosure preferences are session-only and preserve existing pending edit and Undo behavior.

## Audio and background homes (#261)

Project Settings → Audio owns narration mode, presentation-wide narration and the presentation soundtrack. Inspector → Sound owns the current slide narration, with explicit scope, local audible preview/seek, paired volume controls and narration-end advancement. Existing selected-video controls retain ownership of video audio.

The slide Inspector has one **Background** disclosure containing **Fill & image** and **Effects & motion**. These retain their separate staged previews, Apply/reset actions and presentation-default/slide-override behavior. Project Settings → Background retains the presentation defaults. Moving the original controls preserves handlers and saved settings; the navigation refinement does not merge independent fill and decoration data.
