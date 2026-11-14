# Audio and narrated playback — proposed contract (#244)

Status: maintainer-approved design for milestone 22, not implemented or release approval. On 2026-11-13 the maintainer explicitly answered “Approve guarded audio v5” for audio-bearing projects, with retained v1–v4 imports and existing audio-free export generations. This authorizes the guarded format design for #245/#246. Current v0.16.0 remains unchanged; #241 is deferred separately.

## Roles and authoring

A presentation chooses narration mode None, Per-slide or Presentation-wide. Per-slide and presentation-wide narration are mutually exclusive for playback. Switching modes retains inactive assignments for an undoable return; removing a role clears its reference, not a shared original asset. Background music is independent and can coexist with either narration mode. One source track per role/slide; no timeline mixing or multiple narration layers.

Project settings → Presentation audio owns narration mode, overall narration and music. Slide Audio in the Inspector owns per-slide attachment and end behavior. Each exposes local file name, measured duration when available, replace/remove and explicit Play preview/Stop preview. Music alone exposes loop. Narration never loops independently. Narration and music each have separate saved volume (0–1, default 1); session mute is not a saved edit. No automatic ducking. Replacing a source preserves role settings, stops preview, and records one Undo step. Cancel leaves state/assets unchanged. Locks and stale asynchronous callbacks cannot modify a newly selected slide/project. Undo/Redo restores references and original bytes without changing IDs.

Editor previews are explicit, local and exclusive: starting one stops the previous preview. They do not advance slides or send live audio to Presenter. Thumbnails, Library cards, holding-design previews and private Presenter previews remain silent. New guides and a real Audio settings screenshot will be added with authoring; do not update public imagery before actual implementation and acceptance.

## Playback lifecycle and ownership

The intended audience document alone owns live audio. Presenter controls request playback through the existing authenticated session channel; opener/private iframe/catalog never produce duplicate audio. A click in Presenter may not grant browser activation in the separate audience window: show a visible keyboard-accessible Enable audio control in the audience document, and a private status until that audience gesture succeeds. Never claim that postMessage bypasses autoplay policy.

On initial load/reopen/reconnect, all audio starts paused. Play is an explicit gesture; rejected play promises expose blocked status and a retry control, retain the slide, and do not start an advancement countdown. Pause pauses narration/music and freezes end padding; Resume continues from the same positions after activation. Seek is local media time, clamped to finite duration; seeking narration to its end while playing follows the one-shot end rule below. While paused it stays paused. Session volume/mute applies without changing saved project state; role settings are authored separately.

Manual Next/Back/jump stops outgoing slide narration and cancels its callbacks; the new slide starts its narration from zero only if playback was already active and allowed. Overall narration and music continue across slide navigation and are never slide synchronized. Explicit Restart resets current slide narration, overall narration/music and pending timers; after reaching the final slide, Play alone resumes the ended state and Restart is the explicit replay action. Presentation looping restarts all active tracks at the deck boundary; music looping is independent. At a nonlooping presentation end, stop all tracks and cancel advancement.

Blackout/holding pauses all audio and pending timers with the audience; Restore retains positions but requires explicit Resume. End session, project switch, audience close/disconnect or ownership replacement pauses/disposes audio, cancels callbacks and revokes obsolete URLs. A replacement audience must explicitly enable/resume and the former owner must be stopped before it can start. Stale messages/events from a previous slide, project, asset or session cannot play or advance anything.

Booth/kiosk exports retain authored roles but need an initial Enable audio/Play gesture after loading; no audible autoplay promise. Existing video audio remains independent with its current defaults; narration/music are additive, so the guide recommends muting video audio where unintended mixing would occur. No implicit video mute or ducking. Media Focus preserves the single audience owner and cannot create a duplicate audio element.

## Advancement precedence

For an active per-slide narration assignment, authors may select Advance when narration ends with padding in integer milliseconds, range 0–600000, default 500. When enabled, a valid finite narration end owns advancement instead of both the slide timer and video-ended advance; there must be exactly one active advancement owner. Otherwise existing timer/video behavior is unchanged. Overall narration and music never trigger per-slide advancement.

End handling requires the current audience session, visible slide ID, asset generation and playing state to match. One ended event schedules at most one advance; repeated events do nothing. Pause freezes the remaining padding; manual navigation, replacement, seek away from end, removal, project/session switch and hidden/deleted current slide cancel it. Resume continues the remaining padding only if all identities still match. During continuous-narration playback, manual navigation leaves that track at its existing position.

If end-based narration is absent, failed, unsupported or has invalid/nonfinite duration, show a failure/status and use the existing timer/video advancement policy only after the author/audience explicitly continues without narration. Do not silently skip unheard content or wait indefinitely without controls. Reordering uses stable slide IDs; hidden/deleted slides are never scheduled. If the current slide disappears, stop its narration and choose the existing valid visible fallback without resurrecting stale events.

## Local assets and bounds

Accept local MP3 (audio/mpeg), WAV (audio/wav or audio/x-wav), M4A/AAC (audio/mp4 or audio/aac), and Ogg (audio/ogg) candidates with matching extension and supported browser decode. MP3/WAV are the cross-browser recommendation; container/extension does not prove codec support. Reject empty files, files larger than 250 MiB, remote/data/executable paths and malformed metadata. Probe metadata with a bounded 15-second timeout before attachment; duration must be finite, positive and at most 24 hours. Show a useful unsupported-file message and retain the previous assignment on failure. These are proposed bounds, not existing media guarantees.

Keep original bytes under generated collision-resistant assets/audio-<id>-<sanitized-name> paths using the existing safe relative assets/ contract. Preserve the original display name (bounded 255 characters), MIME, byte length and measured duration as validated descriptive metadata; runtime rechecks the actual media. Never store absolute paths, permissions, credentials, blob URLs, playheads, activation tokens or live state. Aggregate ZIP/recovery limits remain authoritative and must be checked before allocation; an individual file limit is not an aggregate budget increase. Removing/replacing one assignment cannot garbage-collect a blob used by another role, Undo history, component or recovery snapshot.

## Compatibility decision for maintainer review

Existing infrastructure uses stable slide IDs, mediaBlobs/mediaURLs and safe assets/ paths; project validation is guarded through native v4 for custom backgrounds. Presenter bootstraps transmit an immutable project and original blobs to separate audience documents; private previews already suppress media. Current media assignments validate image/video, so audio must be a separate typed role contract, not disguised as a video or an ignored extra v4 field.

Propose native project schemaVersion 5 only when audio settings/assignments are present. Keep all v1–v4 imports and unchanged no-audio exports at their existing generation. A v5 pack includes state.audio={version:1,mode,slides,overall,music}; slides keys are existing slide IDs and references use validated local assets. Each track stores src/name/mime/bytes/durationMs/volume; music adds loop; slide narration adds advanceOnEnd/paddingMs. Unknown keys, invalid roles/references/bounds and missing assets are rejected with no partial active-project replacement. Define the exact machine schema and authoring-pack adapter with #245 after approval.

Older v0.16 readers must reject v5 explicitly instead of silently dropping audio. Import/recovery/component/AI/HTML/playback/booth/editable-ZIP paths must preserve supported roles and original bytes or reject clearly. Ordinary components exclude presentation-wide audio; component save/import of a slide with narration must either carry its typed dependency under an explicitly compatible component version or visibly reject it until that version is approved. Do not imply current component formats can carry it. Never add a downgrade option that silently strips audio. AI instructions/schema/catalog need an explicit compatible authoring extension before audio can be generated/imported there; older authored packs still work.

Approval recorded: guarded native v5 for audio-bearing projects, retaining v1–v4 import and existing generation for audio-free packs. The maintainer approved this concrete proposal in chat on 2026-11-13. Runtime implementation and actual acceptance evidence remain outstanding.

## Acceptance matrix and delivery order

| Area | Automated evidence required | Independent manual evidence required |
| --- | --- | --- |
| Authoring #245 | Attach/replace/remove, timeout/decode errors, bounds, locks, Undo/Redo, stale selection, unchanged IDs | File names/duration/status readable; keyboard and screen-reader role controls |
| Persistence #245 | v1–v4 fixtures unchanged; v5 refusal by old reader; clean-profile editable ZIP/recovery import, original byte hashes, missing/shared assets, component and AI contracts | Real saved project and offline reopen on supported browsers; no silent data loss |
| Playback #246 | One owner; blocked play; pause/resume/seek; timer precedence; end/padding cancellation; duplicate/stale events; hidden/deleted/reordered slides | Actually audible narration/music, codec failures, browser activation recovery, mute/volume and video coexistence |
| Presenter #246 | Private previews silent; reconnect/disconnect/session/project disposal; authenticated ordering; blackout/holding freeze | Dual-display audience-only sound, Enable audio focus, Resume/Restore behavior |
| Export #247 | Editable/playback/booth paths, clean-profile restore, assets exact hashes, no absolute/remote URLs, legacy fixtures | Offline actual audible playback in Chrome/Edge/Firefox with exact OS/browser/artifact versions |
| Accessibility #247 | Accessible names/focus/status; no keyboard traps; reduced-motion unaffected | Screen-reader announcements, visible blocked/error recovery and keyboard use |

Implement in order: agree #244 and the format decision; author #245; integrate #246; complete #247 automated and manual acceptance. CI event/element assertions do not prove audible output, codecs, autoplay or actual dual-display use. Record exact artifacts/environments and pending checks; do not infer success from unit tests. No release/version bump is authorized here.

Deferred: synchronized continuous-narration slide markers, automatic ducking, microphone capture, TTS, waveform timelines, remote services and new dependencies.
