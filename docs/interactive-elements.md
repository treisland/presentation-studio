# Buttons, links and media frames

Milestone [0.13.0](https://github.com/treisland/presentation-studio/milestone/13): navigation [#162](https://github.com/treisland/presentation-studio/issues/162) and masking [#163](https://github.com/treisland/presentation-studio/issues/163). Implementation was explicitly authorized by the maintainer. Feature review does not authorize release publication.

## Navigation

Add / Library offers a filled Button, outlined button, underlined Text link and unfilled Navigation arrow. Edit labels on the canvas or with the text Inspector. The expanded Button action section stays at the top of Content; complete action and slide choices save immediately with Undo. URL typing shows a pending indicator; Enter or leaving the field validates and saves the URL. Incomplete or invalid values retain the previous active action and show that the edit is not active yet. Escape discards a pending URL edit. See [navigation behavior](navigation.md).

Edit blocks continues to select and edit; Preview and presentation activate actions. Linked elements have an editor badge, keyboard activation and visible focus. Linked media uses a separate Open link button so video playback and Media Focus remain available. Template buttons and links can use an action on their containing element; the assigned action takes precedence over the contained link in Preview/playback.

Only absolute HTTP(S) URLs without embedded credentials are accepted. External resources open a new tab with opener isolation. Offline exports retain the links; fetching external resources requires connectivity.

Slide destinations reference stable IDs, so reordering retains the destination. A duplicated element keeps its original destination, including a self-link to the original slide. Project copies/imports retain slide IDs. Components retain destination IDs: when inserted into another project they may need a new destination. Missing/deleted targets display a warning in the Inspector and a visible message when activated. Presentation links outside the selected playback loop report that limitation. Next/previous follow project slide order and stop at its boundaries. Booth exports use their retained slide order. Booth navigation and external-link permissions apply independently.

## Media frames

Add / Library offers rectangle, rounded, circle and oval placeholder frames. Select a frame and use Replace selected media to choose an image or video, or apply a frame to existing media through **Media frame** in Content. Existing media frame/border appearance remains available, and Save as component retains media, frame settings and appearance for independent reuse.

Choose a shape, Fill or Fit, and None/Soft/Strong shadow. Shared sliders and precise fields control Zoom (100–400%), Crop X/Y (0–100%) and rounded corner radius (0–50%). Crop percentages describe object position and zoom origin; 50/50 centers the media. Fill covers the frame, while Fit can leave empty space inside it. Double-click media or check **Drag media inside frame** to adjust X/Y directly. Numeric controls are also the keyboard alternative.

Adjustments are previews until **Apply frame**, which creates one Undo step. Reset crop stages centered media at 100% zoom; Remove frame restores the original media rendering. Selection/revision changes discard pending adjustments. Frame resizing retains the relative crop, zoom and radius. Replacing media retains these settings even when aspect ratio changes; inspect the new crop afterward. Original image/video bytes, placement, captions and alternative text remain intact. Media Focus shows the original media outside the decorative mask and returns to the masked frame afterward.

## Persistence and authoring contract

Changing a media object's placement between floating, left, right and background retains its frame and appearance. When structured placement exchanges primary and floating media, both objects keep their own settings; Undo restores the original slots. Layer ordering does not change the absolute layout positioning used by structured media.

Border padding (0–25%, default 0) insets the media inside its mask while leaving the outer border and frame size unchanged. The gap shows the frame fill, or the slide behind a transparent fill. Padding uses a percentage of each frame dimension, scales with resizing, previews with the other numeric controls and saves with Apply frame. Reset returns to zero; Media Focus shows the original media without padding.

The media's own fill, outline and shadow follow its mask contour. The slide background and other objects behind the media remain visible outside that contour. Captions and playback/link controls remain separate; rectangular editor selection and resize handles still describe the object's layout bounds.

Validated optional `action` and `frame` fields live in existing per-object design metadata. Existing native-v1/v2 imports and the guarded native-v3 background-effects contract remain unchanged; opening an old project adds no overrides. Editable ZIPs, browser recovery/history and component libraries retain these fields. Older Studio builds do not understand these new optional fields; use the current build to edit projects containing them. Standalone playback and booth exports include the same navigation/mask renderers without external runtime services or dependencies. Booth output includes only action/frame metadata for exported slides, without private authoring names/history.

The portable AI-authoring v1 schema remains unchanged: these are editor-authored native settings, not new AI block types. Do not generate unsupported action/mask fields in portable authoring JSON. Arbitrary paths, gradient/alpha masks, scripting, conditional navigation and new services are outside this milestone.

## Validation and remaining manual review

Automated workflows cover safe actions, Preview navigation, Undo, numeric staging, locks, editable ZIP/offline reopening and standalone booth masks/keyboard navigation/permissions. Run `npm run check`, `npm run package` and `git diff --check`; record actual results on the linked PRs.

Before release, manually review light/dark and small-screen layouts, keyboard authoring and screen-reader announcements, real image/video crop and replacement at differing aspect ratios, Media Focus return, internal/external links, clean-profile recovery and downloaded offline editable/playback/booth packages. Supported OS/browser versions, real delivery video and OBS evidence remain separate from automated Chromium checks. No new manual release gates are claimed complete.
