# 0.6.0 customization review — issue #111

This is an unpublished beta follow-up. Fresh maintainer manual review and protected platform checks are required; publication remains disabled.

## Element names

Layers displays a stable automatic name by type (Text 1, Image 1, Card 1, Step 1, Arrow 1), with a separate shortened content preview. Counters are per slide. Editing visible content and reordering layers do not rename newly named elements; deleting an element does not renumber the rest. Older projects receive view-only fallback names until an element is edited/named; opening them alone does not rewrite their AST or IDs. Template containers remain container Layers entries until a child is explicitly customized into an independent block.

Use Layer name for a custom override and Reset to automatic name to remove it. Names are editor metadata, separate from displayed text, slide names and accessibility descriptions. Duplicate named blocks receive a Copy suffix; automatic copies receive the next type number. A grouped selection can be named as a group. Search finds names, types, group names and content previews. Custom group names travel in saved presets; inserted copies remain independent.

## Template positions

Select ordinary template text, a card or a section, open Arrange and choose Customize position. Its measured appearance becomes a free block with the existing Move/Resize handles, snapping, alignment, precise geometry, layering and locking. A measured empty placeholder preserves the source layout's space, so neighboring content does not reflow. Small template text can retain dimensions smaller than the normal free-block minimum.

Reset position to template restores that block to its source location without reverting its current text or custom appearance. Ungroup before resetting an individual group member. Duplicated blocks and Library copies are independent; their source-template reset link is removed. Tables, code, media and structured grids retain their existing specialized conversion/positioning controls.

The layout gallery explains the policy: Retain content keeps customized blocks at their current positions as independent blocks; the old template reset link is removed. Replacing content uses the new template prompts. Undo restores the previous content and reset link. Review overflow and reading order after detaching nested content or changing layouts; moving objects and changing visual stacking are distinct from reading order.

## Step number

Widgets in Add / Library includes Step number: a numbered badge plus editable title and description, which may be left empty. Inspector Content controls the sequence and visible number. The badge itself is not an inline text editor, to avoid breaking sequence metadata.

Automatic numbers use the next number in their named sequence on this slide, initially Main. Different sequences can start at 1. Manual overrides remain fixed. Moving/reordering steps does not change visible numbers. Renumber sequence intentionally renumbers automatic steps in document order, skipping reserved manual numbers. Use automatic number resumes allocation at the sequence's next number; it does not renumber other steps. Duplication and preset insertion allocate a new automatic number in the destination sequence. Locks prevent sequence-wide changes if a participating step is locked. The element name and visible step number are independent.

## Arrow / Pointer

Blocks in Add / Library includes Arrow / Pointer. Content provides arrowheads, stroke width, optional label and description, and start/end coordinates. Style provides theme/custom color and Arrange provides positioning/rotation. Endpoints support pointer dragging with alignment snapping (Alt bypass), keyboard arrows (Shift for a larger step), Escape cancellation and a destination marker. Ungroup before editing individual endpoints; moving a grouped arrow uses the existing group controls.

These are free arrows: they do not attach to objects or route around obstacles. Their descriptions are independent of Layer names. Labels remain editable text. Undo, visibility, locks and editable/offline playback/booth exports apply to both annotation types.

## Compatibility and manual review

Existing projects retain their layout on open. Optional names/reset/annotation metadata and safe HTML/class-based content extend the existing project format without a schema migration or new dependency. Current editable backups preserve authoring controls; playback and booth exports render the content without editor handles. Older editors may display fallback content but do not provide the new annotation or reset controls; exact backward editing is not claimed.

1. Open a legacy demo without editing and confirm its layout/IDs remain unchanged. Inspect default names, rename/reset/search, duplicate named and unnamed elements, delete one and add another, reorder, group and rename a group.
2. Customize the demo's intro section, supporting card and an individual heading. Check for jumps or neighboring reflow, move/resize/snap/align, edit content and reset. Check tiny text, hidden/locked elements, grouped content and Undo/Redo. Confirm heading edits still update the intended slide name.
3. Change layouts using Retain content and Replace prompts; inspect the gallery explanation, independent custom positions, overflow and reading order. Undo restores the original reset link.
4. Insert steps from Library; try two sequences, manual numbers, duplicates, explicit renumbering, empty optional text, grouping and locks. Save/import a preset in a clean profile and check independent destination numbering.
5. Insert arrows; drag and keyboard-adjust both endpoints, cancel with Escape, try arrowhead options, stroke, theme/custom colors, rotation, labels/descriptions, layering and group movement. Confirm endpoint/label geometry after resizing and at different zoom levels.
6. Reopen editable ZIPs in a clean profile and playback/booth exports offline. Check keyboard access, visible focus, screen-reader labels, dark/light themes, laptop sizing, recovery and actual delivery/OBS before authorizing a release.
