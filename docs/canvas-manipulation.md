# Canvas movement and manipulation

## Template positioning

Selecting template content leaves its layout intact. For one eligible template text/section, choose **Enable free positioning** in the toolbar or Inspector → Arrange. The measured starting geometry is retained so the item does not jump; its text stays editable. **Reset to template position** is nearby in Arrange and restores layout positioning without reverting edited content or the original element identity. Undo/Redo and portable editable restore retain the existing conversion/reset behavior.

Structured tables, code and grids keep their specialized controls. The positioning panel explains that free positioning is unavailable and directs users to Content settings or media's Arrange → Change placement action. Multiple template selections must be narrowed to one before enabling. Locked items explain that the item or presentation must first be unlocked. No selection automatically detaches content, and no new saved fields or layout defaults are introduced.

In Edit blocks, selected free blocks, floating media and temporary/group selections have an explicit Move grip and resize handles. Drag the grip to move; keep clicking text, table cells and existing controls for their normal editing behavior. Selecting an item does not detach template content or change saved positioning.

Resize targets remain 24 CSS pixels and Move grips 30 × 26 CSS pixels as canvas zoom changes. Thin selections spread their handles into a usable grid; edge targets stay inside the visible canvas and viewport. A selected object entirely outside the viewport still needs pan/Fit or keyboard positioning. Handle view coordinates are session-only and never change the project's placement, IDs, recovery or exports. Rotated selections retain their content rotation while grips remain upright.

Grips use the existing native popover platform to sit above overlapping content while remaining owned by their original object in the DOM. Only the grips are elevated; saved and displayed content layer order stays unchanged. Preview and editor closure remove the grips.

Keyboard-focusable grips have visible focus rings. Existing Arrow movement/resizing, Shift faster nudges, Escape cancellation, locks and Undo remain available. Locked block/group grips are disabled and explain that the item or presentation must be unlocked. Inspector and Layers provide the existing route to unlock. Floating media now has a distinct Move grip in addition to its existing frame behavior.

Automated coverage checks small blocks at both slide corners, normal and narrow editor viewports, light/dark and forced colors, screen-space target sizes, actual hit testing, media/group scaling, keyboard Undo and lock explanations. Existing eight-handle geometry, media, group, editing and offline suites remain required. A 683-CSS-pixel viewport exercises responsive layout; it does not claim a real 200% installed-browser or screen-reader session. Those manual milestone checks remain pending, independently of issue #9.
