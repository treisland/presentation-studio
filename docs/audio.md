# Local narration and background music

Development feature for milestone 22; not part of the published v0.16.0 app. Authoring is introduced in #245. Audience/booth playback is implemented in #246; independent actual audible acceptance remains #247. These development changes do not authorize a release.

In the slide Inspector, open **Slide audio** to attach or replace local per-slide narration. **Project settings → Brand → Presentation audio** owns the narration mode, one overall narration track and separate background music. Modes are None, Per-slide and Presentation-wide; switching modes retains inactive attachments. Background music has its own volume and looping. Existing video audio is independent; mute it if you do not want mixing.

Choose a supported MP3, WAV, M4A/AAC or Ogg file. MP3/WAV are recommended; actual codec support depends on the browser. Empty, malformed, unsupported or timed-out files leave the previous assignment intact. Tracks show filename and measured duration. Playback preview is local to the editor, never advances slides and never sends sound to Presenter. Play/Pause preview retains position; Stop resets it. Switching slide/project, replacing settings or closing the editor stops preview.

Each role has authored volume. A slide can request advance on narration end, with integer padding from 0 to 600000 ms (500 ms default); narration-end playback arbitration takes precedence over both slide timers and video-ended advancement. Overall narration does not synchronize slide changes or advance individual slides. There is no ducking, recording, TTS or timeline editor.

Original bytes are bundled in editable ZIPs and browser recovery. Remove clears an assignment, not source files used by another role or Undo history. Undo/Redo restores references. Slide duplication retains narration with a new slide ID and the same original source. Locks prevent changes; an upload that finishes after selection/project changes is rejected.

Audio-bearing packs use maintainer-approved native v5; v1–v4 imports and audio-free export generations remain supported. Older apps reject v5; use the complete editable ZIP in an audio-capable Studio. Do not downgrade its schema number. Removing current audio does not necessarily lower the pack version while Undo/checkpoints still contain audio. JSON alone excludes original media; export a complete editable ZIP.

Existing portable imports cap input at 100 MiB and expanded assets at 200 MiB. Audio attachment conservatively caps the resulting referenced bytes/history plus JSON at 95 MiB to leave room for the exported HTML/ZIP structure. The individual 250 MiB metadata ceiling does not increase this portable budget. Choose a smaller track or a clean project copy when needed; do not remove your only backup.

Current saved components do not support narration. Saving a component from a narrated slide reports that limitation; use the full editable ZIP. Portable AI authoring v1/v2 do not accept audio fields and reject them instead of silently dropping audio; original native ZIPs remain the transport. No AI authoring extension or component-format generation is advertised here.

The authoring UI affects the editor overview and future Audio settings screenshot scenes. Existing public companion images are not refreshed or accepted for audio by these code changes. Browser-specific audible/activation, dual-display, keyboard/screen-reader and offline acceptance remain in #247 and must record exact artifact, OS and browser versions. See [the approved contract](audio-contract.md).

## Playing audio

After opening a presentation, choose **Enable audio and play** in the actual audience/player document. A Presenter control message cannot grant browser activation to another window. Private previews and thumbnails remain silent; the opener stops owning audio while Presenter is active. The private status explains when the audience needs activation or has a playback error. Reopening needs a fresh gesture. An audience heartbeat timeout stops audio after the Presenter connection disappears.

The Audio menu offers retry, explicit continuation without audio on this slide, session mute/volume, narration seek in seconds and Restart audio. Session controls never rewrite authoring defaults. Blocked/failed audio holds automatic progression until retry or explicit continuation. Pause freezes remaining end padding; manual navigation, source change, seek away from end and ownership/project change cancel stale advancement. Per-slide narration restarts on navigation while overall narration/music retain positions. Loop boundaries restart tracks; nonloop narration completion at the last slide stops audio until explicit restart.

Blackout/holding pauses audio and keeps positions. Restore requires explicit Resume for audio-bearing decks. Separate active copies of the same project coordinate ownership over BroadcastChannel where the browser shares an origin; intentionally separated origins/file storage partitions cannot promise cross-origin coordination. Within a Presenter session, private documents never own live audio and an old audience is closed before replacement. Never activate two independent cross-origin copies expecting global coordination.

Standalone booth exports include the shared controller and original audio files, work offline and expose their own explicit activation/controls. Their slide and video timers yield to narration-end ownership. Existing video audio stays independent; no automatic ducking or implicit video muting is added. Media focus pauses/resumes under the same single controller and does not instantiate duplicate tracks.

Automated synthetic WAV checks prove timing/state, asset bundling and offline restoration; they do not prove physical speakers, audible level, real codec coverage or dual-display/screen-reader acceptance. Record those separately under #247.
