# 0.9.0 — Layers and Style workflow

Implemented through [#126](https://github.com/treisland/presentation-studio/issues/126) / PR #127 after the 0.8.0 workbench prerequisite PR #125. The maintainer accepted the integrated implementation on 2026-11-10 and explicitly authorized beta delivery with confirmed manual gates. See the separate [0.9.0-beta.1 validation record](releases/0.9.0-beta.1-validation.md). Publication still requires protected release preparation and validated artifacts.

## Shared navigator

Slides and Layers share the left dock. Choose Layers to inspect the current slide's elements without leaving the right Inspector's Content, Arrange or Style section. Search by element name/content; select a row to inspect it or use checkboxes for a batch. The summary distinguishes selected objects from the visible results.

Visibility and editing locks use eye/eye-off and open/closed padlock icons with accessible action names and tooltips. Hidden elements remain listed. Hiding must preserve the positions of visible neighbors instead of reclaiming layout space; template text and cards follow the same rule. A locked element remains inspectable, but blocked edits cannot partially change a mixed selection. Reordering retains drag and keyboard controls and the existing specialized grid behavior.

Naming retains custom names, automatic per-type names and reset to automatic. Double-click a layer name or press F2 on its row to rename inline; Enter saves and Escape or leaving the field cancels. Layer options also provide a labeled name field and reset. Element labels identify their type and use a short content preview rather than replacing their name with long content. Visibility controls and editor-only hidden-element inspection live with Layers; slide/presentation header/footer defaults remain available separately.

## Compact Style

The Style panel summarizes Text, Fill and Border colors as labeled rows. Without an element selection, it explicitly offers Slide background styling. Theme roles, custom hex values and Mixed states remain distinguishable. The Inspector identifies the selected object; shared appearance controls style the selected element, not an arbitrary highlighted character range. Existing inline text controls remain the route for supported text-range formatting.

Choose a property to open its color editor. Theme, Custom and Project sections retain theme roles, the native color picker, hex validation, opacity, transparency, contrast guidance, named swatches and scoped inheritance reset. Changes affect the chosen target only. Closing/cancelling custom input does not commit a draft; selection/target changes must not apply an old draft to a different element. Locked selections remain protected by the existing validated operations.

Presets and copy/paste appearance remain available. Border width retains its actual pixel units; opacity is a percentage. Color reset restores inheritance for the active property, not an unrelated full-object reset. Contrast estimates retain their stated limitations for opacity, images and non-solid backgrounds.

## Alignment in Arrange

Under **Align to slide**, Horizontal offers Left, Center and Right; Vertical offers Top, Middle and Bottom. Each command moves the selected block on one axis only. For top-left, choose Left then Top; for bottom-right, Right then Bottom; for center-top, Center then Top. These controls position the whole object rather than aligning text inside it. They do not resize the object or change its layer. Each click is one undoable command; moving/resizing a template item first makes these controls available. Locks and read-only mode disable them. The two labeled groups wrap in narrow panels and retain tooltips, accessible names and normal keyboard button controls.

## Selection-driven Content

Content follows the selected text, widget, table, code, media or grid cell. The old category row is retired; insertion belongs in the Library. A scoped nested-field picker and collapsed alternatives retain legacy text/table editing, while Slide notes live in a persistent drawer without replacing object selection. See the [Content workflow and manual review](content-inspector.md).

## Compatibility and review

Dock location, color-editor state and focus are editor view state, not project content. Saved formats, stable IDs, grouping, recovery, history/media, legacy imports and editable/offline playback exports retain their existing contracts. No provider, folder, MCP, dependency or release-plan changes are introduced.

Playback exports retain empty measured layout spacers where removing hidden flow content would shift its neighbors. When primary media is hidden, playback and booth output retain only its layout settings so the surviving text keeps its position; the asset assignment and bytes are omitted. Hidden text and media remain omitted; editable backups retain the original content for later showing or Undo. Existing portable placeholder geometry and validated class tokens are reused without introducing a project-format version.

Manual review should cover:

1. Light/dark appearance at desktop and laptop widths, narrow windows and actual 200% browser zoom. Panel reveal/resize controls and Style actions remain reachable.
2. Keyboard navigation between Slides/Layers, row selection, multi-selection, search, rename, visibility, locks and reordering. Hide template text/cards and confirm neighboring elements remain in place; show them again and Undo. Inspect screen-reader names, state announcements and focus after rerendering.
3. Style with a single object, nested text, no selection, mixed selection and a locked batch. Verify the target is explicit and unsupported controls do not imply broader edits.
4. Theme/custom/project colors, valid/invalid hex, opacity, no fill, scoped reset, presets and copy/paste. Cancel drafts and change the selection while a color editor is open; no stale or partial edit may occur.
5. Template/media/grid/table/code selections and existing positioning controls. Combine Horizontal/Vertical alignment for top-left, bottom-right and center-top; verify only the chosen axis moves and Undo restores it. Check a Library widget, customized template text and locks. Hide primary media with different text/media ratios and check text positions in playback and booth output. Save a complete editable ZIP with media/history, restore it in a clean profile and verify legacy imports/offline playback.

Automated regression results are recorded in the PR. They do not establish manual screen-reader or final visual acceptance.
