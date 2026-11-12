# Buttons and hyperlinks

Assigned issue [#162](https://github.com/treisland/presentation-studio/issues/162), milestone 0.13.0. Implementation explicitly authorized by the maintainer; publication requires separate release preparation.

## Navigation

Add / Library offers a filled Button, outlined button, underlined Text link and unfilled Navigation arrow. Edit the label on the canvas or with the existing text Inspector. Existing appearance controls customize text, fill and border. Select a text, shape, button or floating media element: its action controls stay expanded near the top of Content. Choose None, Go to slide, Next slide, Previous slide, or Open URL in new tab. Complete action/slide choices save immediately with Undo. URL typing shows a pending indicator; Enter or leaving the field validates and saves one change. Incomplete/invalid values retain the previous active action and show that the edit is not active yet. Escape discards a pending URL edit.

Edit blocks continues to select and edit; Preview and presentation activate actions. Linked elements have an editor badge, keyboard activation and visible focus. Linked media uses a separate Open link button so video playback and Media Focus remain available. Template buttons and links can use an action on their containing element; the assigned action takes precedence over the contained link in Preview/playback.

Only absolute HTTP(S) URLs without embedded credentials are accepted. External resources open a new tab with opener isolation. Offline exports retain the links; fetching external resources requires connectivity.

Slide destinations reference stable IDs, so reordering retains the destination. A duplicated element keeps its original destination, including a self-link to the original slide. Project copies/imports retain slide IDs. Components retain destination IDs: when inserted into another project they may need a new destination. Missing/deleted targets display a warning in the Inspector and a visible message when activated. Presentation links outside the selected playback loop report that limitation. Next/previous follow project slide order and stop at its boundaries. Booth exports use their retained slide order. Booth navigation and external-link permissions apply independently.

## Compatibility and review

Actions are validated optional fields in existing per-object design metadata. Save/recovery, component libraries and editable/playback/booth exports retain them. Existing imports and the background native-v3 guard remain unchanged. Use the current Studio build to edit action-enabled projects; older builds do not understand these new fields. The portable AI authoring v1 schema does not introduce new action fields.

Run npm run check, npm run package and git diff --check. Manually review keyboard and screen-reader behavior, light/dark and narrow layouts, missing targets, linked template controls, external new-tab resources and downloaded offline packages. New manual release gates remain pending.
