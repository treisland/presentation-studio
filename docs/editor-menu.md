# Editor menu bar

Milestone [#26](https://github.com/treisland/presentation-studio/milestone/26)
was maintainer-tested and accepted before the start-screen work. Both are
included in 0.18.0-beta.1 after acceptance of runtime `4c25100` on 2026-11-15
(America/Denver). Publication follows the separate protected release plan.

## Command ownership

**Help → Keyboard & menu help** is modal. Escape or Back to editor dismisses
only help and returns focus to the Help menu. Keys in help do not invoke editor
Undo/Redo or close its preview.

Milestone 27 adds **File → Start screen** to return to recent projects, Open
project, creation choices and browser-local startup preferences. Opening this
screen does not change the project or Undo history; existing switch/recovery
guards still apply. See [start-screen behavior](start-screen.md).

The horizontal menu bar follows the conversation POC: a stable row of commands,
a compact toolbar, prominent Present/Export, and selection-driven Inspector
controls. The generated POC is design guidance, not an authentic application
screenshot. Its example shortcuts and incidental artwork are not requirements.

| Menu | Primary purpose |
| --- | --- |
| File | Project management, import/export, recovery and presentation settings |
| Edit | Undo/Redo, duplicate/delete, naming and saving reusable components |
| View | Slides/Layers/Inspector, zoom, snapping, editing mode and workspace preferences |
| Insert | Library categories, slides and presentation audio |
| Format | Content/appearance/media destinations and presentation theme/background |
| Arrange | Ordering, alignment/distribution, grouping, locks/visibility and geometry |
| Slide | Slide operations, layout, background, narration, notes and presentation navigation settings |
| Help | Website/documentation, public presentation gallery, walkthrough/About and menu keyboard help |

Help → **Website & documentation ↗** opens <https://docs.pres-studio.com/>;
**Presentation gallery ↗** opens <https://gallery.pres-studio.com/>. Both open
in a separate tab with no access to the editor window. These online resources
require a connection; the walkthrough and keyboard help remain available offline.
The editor overview companion screenshot scene needs review when Help is shown;
no public companion asset or deployment is changed by these shortcuts.

Only existing capabilities are exposed. Values remain in Inspector Content,
Arrange and Style: position/size, typography, colors, crop/frame, media settings,
content and component configuration. Commands ending in an ellipsis reveal
existing controls instead of opening a second editor. Useful toolbar and
context-menu shortcuts use the same actions. Slide/media Duplicate/Delete buttons leave the selection header after equivalent
menu/context access is retained. Free-block/text contextual shortcuts remain.

Menus retain stable command positions for different selections, with unavailable
operations disabled. Shared locks, pending-edit commits, Undo, stale-target
guards and confirmations remain authoritative. Navigation does not create a
project edit or a saved preference. No new saved-format generation is introduced.

## Local testing

Run `npm run build`, then `npm run serve`, and open
<http://127.0.0.1:4173/>. Open the editor and try each menu with slide, text, media,
group and mixed selections. Use Help's menu instructions for supported keyboard
navigation. Check the downloaded `release/` packages separately after
`npm run package`; a development server does not prove offline reopening.

Review these workflows before acceptance:

1. Use keyboard, mouse and touch to open menus/submenus, dismiss them and recover
   focus. Leave the menu bar with Tab and Shift+Tab. Keep browser/text shortcuts.
2. Edit an Inspector field, invoke a menu command, and verify the field commits
   to its original object. Test locks, mixed selections, duplicate/delete and Undo.
3. Follow Position & size, crop/frame, slide background and audio destinations;
   confirm correct target, scope and Inspector section.
4. Check desktop/laptop/narrow layouts, light/dark themes and actual browser zoom.
5. Export an editable ZIP with media/audio, reopen in a clean profile, and check
   legacy projects, recovery, reusable components and offline playback/booth.

Command search, ribbons and customizable menus remain deferred. Beta publication
uses the approved release plan; hosted deployment remains separately authorized.

## Companion documentation and images

Affected canonical guides are this page, editor-workbench, Inspector navigation
and context menus. The **editor overview** screenshot scene requires refresh
for this alpha; AI import preview should be reviewed for visible editor chrome.
Examples gallery, Media Focus and finished playback require review for continued
accuracy before any public claim. All public scene acceptance is pending for
this local alpha. Automated screenshots under ignored `test-results/` are local
review candidates only; they do not replace public assets or image manifests.
The companion site has not been changed or deployed. Follow
[website-process](website-process.md) for later capture provenance and publication.

**Insert → Project media** opens the project-wide original-media library. **Inspector → Sound** also provides Project media and Record narration actions. These are local author tools; audience playback has no corresponding download controls.

The canvas narration strip offers immediate record, stop/cancel, preview/seek,
retake/discard and Use take controls without opening a dialog. Its gear menu owns
microphone selection and a shortcut to narration settings.
