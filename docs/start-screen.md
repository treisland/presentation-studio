# Start screen and startup behavior

Milestone 27 / #269. The conversation mockup is the visual reference, not a
capture of the application. This alpha awaits maintainer local acceptance.

## Behavior contract

The generic app opens a start screen with recent browser drafts, Open project,
Blank presentation, Choose a template, and Try an example. Recent entries are
browser recovery copies, not links to files on disk. Open project accepts the
existing editable ZIP/JSON formats. Templates and examples use the existing
gallery and setup flow; no new template format or catalog is introduced.

On startup is a browser-local preference: Show start screen (default), Resume
last project, Create blank presentation, or Open project picker. Browser security
requires a click to open the operating system picker, so that last option shows
the start screen with Open project focused and an explanation. Preferences and
last-project identity do not travel in presentation exports.

Recovery for the initial project takes precedence over automatic creation or
resume. Unreadable/missing drafts or unavailable storage fall back to the start
screen without deleting records. Explicit exported projects, playback exports,
presenter/audience and booth routes bypass generic startup behavior. Explicit
`?start=present` opens the bundled presentation directly; `?start=editor` opens
its editor. These routes do not change the saved preference.

File → Start screen returns here without saving, changing IDs, or adding Undo
entries. Continue current presentation returns to the existing editor. Switching,
creation and file import use the existing recovery/save guards and asset checks.
Closing or cancelling a picker leaves the start screen available.

## Alpha review

Test first visit and populated recents, ZIP/JSON opening and cancellation, blank
creation, template/example setup, each startup preference after reload, missing
last project, unavailable storage, pending recovery, and exported project/offline
playback reopening. Check light/dark, keyboard/focus, laptop/narrow layouts and
browser zoom. Screen-reader and physical-input review remain manual.

Canonical guides affected: quick-start, first-presentation, editor-menu and local-workspaces.
Companion scenes: editor overview and examples gallery pending review against
this alpha; Media Focus, AI import preview and finished playback need review for
continued accuracy. A new start-screen capture is pending accepted runtime
identity and human review. No companion images or deployment are published here.
Existing companion capture recipes explicitly use `?start=present` to retain
their editor/playback starting surface rather than capturing the start screen.
