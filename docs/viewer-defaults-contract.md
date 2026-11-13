# Viewer defaults contract

Issue #203. Optional `state.viewerDefaults` contains only version 1, preset
(`presentation`/`playback`), autoHide, showNotes, showProgress and showCount (booleans).
Optional footerStyle is modern (default), classic or hidden. Optional showTimer and showTimeBar are booleans that default to true when omitted, including older
authored defaults. Unknown fields/versions/types are rejected. No presentation content, media paths,
scripts or provider settings belong in it. Authoring uses an explicit Save defaults
transaction and respects project/slide locks, Undo, recovery and export.

Files without this optional UI preference retain the previous control layout and
Kiosk-driven auto-hide. New defaults/temporary overrides control visibility without
changing whether slides advance. Presentation emphasizes Previous/Next and Notes;
Playback exposes Play/Pause. Show slide timer is independent of either preset and
screen width; it shows remaining time only while timed playback advances. Reset session controls restores authored
defaults, or the legacy fallback. Temporary overrides reset on explicit project load
and never overwrite authored defaults; same-project authoring does not persist them.

This is compatible optional viewer UI metadata, not a new native content generation.
Earlier editors use their legacy controls and may omit these preferences on saving;
content/appearance/IDs remain intact. New supported editors preserve it through
editable/playback/booth exports, browser recovery and Undo. Background-aware content
retains its separately approved v4 guard. Public playback capability restrictions,
authored footer/number visibility, OBS and booth permission gates take precedence.

Auto-hide is independent of Kiosk after an explicit preference. Pointer/tap/focus
reveals controls. Hover, focused controls and open menus/dialogs pin visibility;
hidden controls remain in keyboard order and reveal on focus. Always visible turns
auto-hide off. Session options live under grouped More controls. Playback changes
are announced briefly, never on animation frames. Reduced motion disables fades.

showTimeBar controls the original animated per-slide time line independently of
showTimer (numeric seconds) and showProgress (deck position). All use the existing
playback clock; hiding indicators never changes advancement.

Classic reuses the original on-slide title, number, animated time line and segmented
progress. Hidden conceals footer information without removing navigation/More.
Temporary choices remain session-only; explicit deck defaults preserve the enum
through recovery and editable/playback exports. Older defaults fall back to Modern.
Booth keeps its permission-limited chrome; Hidden suppresses its slide footer.
