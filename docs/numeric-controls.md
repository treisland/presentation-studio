# Numeric controls — beta review

Visual settings share a slider, exact number field, separate unit and individual reset. A small track tick marks the relevant default. Drag to preview; release to commit a direct object adjustment in one Undo step. Exact values remain editable, including supported decimals. Arrow keys adjust one step, Shift+Arrow and Page Up/Down use larger steps, and Home/End reach limits. Escape cancels an active adjustment; otherwise the existing dialog/menu Escape behavior applies.

Background intensity/scale/motion, color opacity/border width, text size, rotation, arrow stroke, logo height, media overlay, grid spacing/crop and workspace panel widths use this component. Every slider is visible whenever its setting is shown; there are no slider reveal/hide buttons. Block/media coordinates, arrow endpoints and narrow formatting controls stack the track below the exact number field. Counts, step numbers and layer order remain discrete fields/actions. Slide duration has quick presets alongside exact seconds; booth idle return has Off and duration presets. Existing Fit/zoom buttons remain compact in this pass.

## Scope and saving

- Media-frame zoom, X/Y crop, rounded radius and border padding use shared sliders/precise fields with percentage units and resets. Padding is 0–25% (default 0), insetting media inside the unchanged border. Numeric and direct-crop gestures preview while moving and save on completion as one Undo step; Escape cancels. Shape, Fill/Fit and shadow choices save immediately. No Apply frame step is required. See [media frames](interactive-elements.md).

- Background controls preview immediately but remain staged until Apply background. Motion speed runs Slow to Fast; its number field is explicitly cycle duration in seconds, so longer durations mean slower motion. Slide reset values follow the saved presentation default; presentation reset values use the effect defaults.
- Color opacity stays staged in its existing color target until a swatch or Apply custom is chosen. Its checkerboard sample previews transparency without changing the slide. Color dialog cancellation and focus restoration remain unchanged.
- Direct border, rotation, text-size, arrow and placement adjustments preview existing canvas elements without changing project data on every tick. The existing validated operation commits at release. One Undo restores the prior state. Font reset removes the explicit size override so the theme/layout supplies the size.
- Grid spacing retains its existing Apply rows/columns/spacing button. Crop changes commit at release. Geometry tracks have no arbitrary zero reset; use the existing layout/reset controls for meaningful positioning defaults.
- Panel sizing remains view-only and does not enter saved projects or Undo history. Logo/media adjustments retain their existing project/media operations.

Mixed selections remain Mixed until deliberately adjusted; no average is saved or presented as a common value. Locked/read-only controls disable their range and reset too. Changing project, slide, selection or revision during a gesture cancels its stale commit. Pointer cancellation and losing window focus cancel uncommitted changes.

Number entry can temporarily be empty while typing. Invalid committed input is explained; leaving the field restores the previous valid value. Scroll-wheel movement scrolls the containing panel instead of changing a numeric value. Every range has a label and value text; number fields retain explicit names, units and validation descriptions. Focus and forced-color styling are included.

This is an editor UI change only: no schema, project identifiers, recovery data or export format is added. Existing ranges and precise settings remain supported. New manual acceptance should cover keyboard/screen-reader use, mixed/locked selections, Undo/cancellation, inherited resets, all staged Apply boundaries, 200% zoom and narrow Inspector layouts.
