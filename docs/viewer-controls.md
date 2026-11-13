# Presentation controls

The viewer uses one viewport footer: slide title and Sections/Slides navigation,
Previous/Play/Next, slide count, Fullscreen, Edit and More. The animated blue line above it shows time elapsed on the current slide, matching
the previous release. It freezes when paused and resets on slide changes. The
separate line below the footer means position in the active section or loop. A separate seconds indicator shows
remaining time only during timed advancement. It is not a second deck-position bar.

Sections appears when two or more named, nonempty visible sections exist;
otherwise the button says Slides. A one-slide presentation hides direct navigation.
The count opens the same navigator. Search matches slide titles locally, omits
hidden slides/sections and renders at most 24 static, silent thumbnails per page.
Numbered titles, section names and a Currently presenting marker supplement previews.

Opening the navigator pauses playback. Close or Escape restores the prior play
state and focus. Choosing a slide stays paused. A target already in the active
loop keeps that sequence; other targets select their section. Section and saved-loop
buttons remain available below the search results. Native search-field keys stay native.

More retains Presentations, Notes, Kiosk, Help and applicable question/command actions.
Edit remains a direct authoring shortcut; playback-only files retain their existing
capability restrictions. On narrow screens slide count and Edit move to More; Fullscreen also moves there
below 560px. Timed playback keeps its separate countdown visible, including videos
configured to advance on completion. More menu labels remain legible before hover
in light and dark modes. Hidden authored
footer/number settings suppress title/progress/count without removing essential controls.
Editor thumbnails and exported slide content retain their existing footer geometry.

This change introduces no saved metadata or playback engine. Viewer presets,
independent auto-hide and private Presenter View are separate coordinated issues.
Manual touch, screen-reader, browser/OS and offline-delivery review remain distinct
from automated regression results. No beta publication is authorized by this feature.

## Presets and visibility

More groups Presenter tools, Appearance and controls, Presentation and Help. Choose Presentation
for direct Notes/manual-navigation emphasis or Playback for Play/Pause.
**Show slide timer** independently controls the seconds countdown in either preset,
including narrow screens and videos that advance on completion. Older defaults
without this option keep the timer enabled. Paused or manually held slides have no
active countdown. Changing
a preset never pauses or starts slides. Auto-hide and Always visible are independent of Kiosk
after an explicit choice; hover, keyboard focus and open menus pin controls. OBS still hides
controls, and reduced motion removes visibility fades.

Viewer changes last only for the loaded project. Reset session controls restores deck defaults.
In Project settings → Presentation settings, explicitly save the current viewer controls as
portable deck defaults, or restore legacy defaults. These changes respect locks and Undo,
survive recovery/editable/playback/booth export, and do not change presentation content.
Older editors use legacy controls and may omit these optional UI preferences when saving.

**Show slide time bar** restores the animated per-slide line and is enabled by
default, including older saved viewer defaults. It follows the existing slide/video
playback clock. It is independent of Show timer seconds, Show deck position and
control presets. Hiding any indicator does not alter playback or slide durations.


## Classic slide footer

Choose **More > Appearance and controls > Slide footer > Classic** to show the
original title, slide count, animated time line and segmented slide progress, with
compact floating playback controls. Modern uses the full-width viewport toolbar.
Modern remains the default. Hidden conceals footer information; navigation and
More remain accessible so you can restore it. Show slide time bar, Show deck
position and Show slide count independently control the corresponding indicators.
Authored footer/number visibility still takes precedence.

In Presenter View, **Audience slide footer** switches the audience between these
styles without changing the live slide or play/pause state. The audience receives
only passive information; presentation controls and notes stay private. Reopening
the audience retains the session choice. Classic is included in ordinary offline
playback exports when explicitly saved as a portable deck default. Booth exports
retain their permission-limited chrome rather than gaining interactive navigation.

Companion scene impact: finished-playback is affected for future development/beta
captures. Current local companion images target stable v0.11.0 and remain accurate
for that immutable artifact; new public imagery/claim acceptance is pending.
