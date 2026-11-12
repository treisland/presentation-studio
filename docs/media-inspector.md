# Selected-media Inspector

Issue #189 consolidates media editing for v0.15.0. It builds on #188 and does not change project formats, IDs or media bytes. #190 supplies contextual shortcuts separately. Feature validation does not authorize a release.

Media in the editor and E in playback open the same selected-media Inspector. Entering from playback opens the full editor on the current slide. A selected media object or grid cell remains the target. With one media object it is selected; with several, Layers becomes the selection route and the Inspector asks for a target. Add media creates another object; Replace explicitly names its target and uses the existing confirmation, stale-revision guard and Undo behavior. Grid cells use their existing guarded upload/replace operation.

## Parity and control ownership

| Previous Media Manager capability | Current primary home |
| --- | --- |
| Slide search, sections and media selection | Slides and Layers, with grid-cell children in Layers. The duplicate media-object list is retired. |
| Upload/drop, replace, caption and image description | Media content; caption placement and Alternative text support the selected object. Canvas drops and Library remain shortcuts. |
| Six layout presets and side proportions | Placement: Left, Right, Below, Full-screen, Background, Inset plus Free placement. Structured exchanges use the existing asset/metadata-preserving operation. |
| Inset corner, overlay and border/browser frame | Placement shows only the applicable corner/proportions/overlay fields. Border treatment remains separate from mask Shape. |
| Fit/Fill and crop focus | One Sizing control in Crop & shape. Unmasked media uses crop focus and X/Y; masked media uses the existing frame crop, zoom and padding. Grid crop retains grid membership/locks. Applying a shape retains the current sizing/crop. |
| Video preview and autoplay/mute/loop | Video playback, including muted preview without a saved mute change. Leaving the selection/editor stops the preview. |
| Slide advancement | Video playback for primary video. Wait for end disables looping. Additional/grid videos keep their existing normal slide timing, with an explanation rather than an ineffective override. |
| Poster upload/removal | Video playback for the selected video, retaining original clip bytes. |
| Show slide | Existing Preview/Present navigation. The main canvas is the preview, with no second media canvas. |
| Import/export | Project Open file and editable/playback exports. Advanced media settings retains legacy primary-only settings JSON with an explicit warning that additional objects and file bytes are excluded. |
| Revert slide media | Restore selected media restores only the selected file, frame and appearance from the opened or last editable-export snapshot. Other objects and their IDs stay unchanged; confirmation and Undo remain available. Newly added objects absent from that snapshot cannot be restored. |

The Media Manager modal is no longer reachable through authoring controls. Its hidden inert DOM remains temporarily for compatibility with internal legacy import plumbing; it is not an alternative editor. The legacy JSON export retains its prior primary-only format. Editable ZIP is the complete portable backup.

Compact Placement buttons keep an icon and label, the same accessible name, keyboard activation and existing placement chooser. Free-placement/reset actions remain secondary shortcuts in Arrange; they do not introduce another layout editor. Grid media must be detached before free/structured placement. Read-only, slide, object and grid locks continue to block mutations.

## Validation and review

Browser tests cover target preservation and ambiguous selection, all seven placement choices and Undo, conditional fields, unified frame sizing, crop preservation, video/posters, restoration and locks, grid editing, editable/offline reopening and existing MP4/WebM focus/playback round trips. Run `npm run check`, `npm run package` and `git diff --check`.

Manual checks remain: laptop/narrow and light/dark layouts, keyboard and screen-reader review, real image/video replacements at differing aspect ratios, muted preview and poster behavior, primary vs additional-video timing, restore confirmation scope, and clean-profile offline editable/playback/booth reopening. No manual release gates are implied by automated tests.
