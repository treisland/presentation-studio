# Audio milestone acceptance (#247)

Status: automated development validation in progress; independent manual acceptance is **pending**. No package version, prerelease, publication or distribution is authorized by this checklist. The maintainer approved guarded native v5, not an assumption that speakers, codecs or assistive technology passed. Known #241 stays open separately.

## Record the tested artifact first

Record the exact commit, dirty flag, embedded development/release identity, HTML SHA256, package/ZIP SHA256, OS/build, browser/version, audio output device, screen reader/version, display arrangement and offline/online state. Use the package generated from the final reviewed revision. A previous v0.16.0 sign-off does not cover new audio. Keep customer recordings and private source material outside the repository.

| Evidence | Result | Artifact/environment or link |
| --- | --- | --- |
| Full npm run check and package | Passed on clean runtime 3b7ed22; acceptance-test revision tracked in PR #259 | See audio-validation.md and PR logs |
| Synthetic WAV metadata/state/timing and exact-byte ZIP restore | Automated checks passed on the validated runtime | tests/audio-core, audio-authoring, audio-player and audio-playback |
| Actual audible narration/music and volume/mute | Pending | Tester, device, artifact and result required |
| Chrome, Edge and Firefox activation and codecs | Pending | Exact versions/builds and real local files required |
| Audience-only sound with two windows/displays | Pending | Actual setup and reconnect/close observations required |
| Keyboard and screen reader | Pending | Actual assistive technology and focus/status observations required |
| Light/dark and laptop/narrow layout | Pending independent review | Record viewport, zoom, theme and result |
| Fresh-profile offline editable/playback/booth use | Pending independent review | Record package hashes and network-disabled observations |

## Concrete manual procedure

1. Keep an editable project backup. In a clean profile, import the complete candidate ZIP. Attach an original short spoken narration to two different slides and a longer presentation-wide narration. Attach distinct background music. Use MP3/WAV and separately test actual M4A/AAC/Ogg codecs on each supported browser; extensions alone are not proof. Record failed codecs truthfully.
2. Verify filenames and measured duration, replacement/removal, independent volumes and music looping. Try None/Per-slide/Presentation-wide without deleting inactive attachments. Check a locked slide and a locked presentation. Undo/Redo must restore authored settings and original attachments. Start a file check then switch slide/project; it must not attach to the new selection.
3. Play editor preview with the keyboard. Pause/resume/stop it, start another preview and close the editor. Only one editor preview may sound; no slide advancement or audience sound may be triggered by private preview.
4. Open actual playback after a fresh load. It starts silent. Choose Enable audio and play; confirm real sound from the intended output device. Pause/resume, session mute/volume, seek away from/end of narration and Restart audio. Session controls must not alter saved defaults. Test a browser autoplay denial, missing file and unsupported/corrupt file; the slide must hold and provide retry or explicit continuation without audio.
5. Set per-slide narration end advancement and padding 0, 500 and 2000 ms. Verify actual narration end owns the next slide instead of the slide timer or video-ended event. Pause within padding, resume, manually jump/back/next, replace a source and repeat rapidly. No double or stale advancement is allowed. Check no-narration slides and the explicit failure-continuation fallback separately.
6. Select overall narration and music. Navigate slides while both sound; their positions should continue and the overall track must not advance slides at its own end. Check music loop, deck-loop restart and nonloop end/restart. Test intentional existing video audio mixing and video muting, plus Media Focus entry/exit. There is no automatic ducking.
7. Use real dual windows/displays. Launch Presenter, activate audio in the audience window, and listen at both outputs. Private live/preview/cards must be silent and contain no audience audio duplication. Browse privately; only Present changes the audience. Blackout/holding must pause sound and padding; Restore requires Resume. Close/reopen/end the audience/session and close the opener: old audio must stop, and a replacement must need activation. Shared-origin copies coordinate ownership; unrelated origins/storage partitions cannot guarantee global coordination.
8. Export editable, ordinary playback and standalone booth ZIPs. Copy to a fresh browser profile/device with network disabled and unzip the whole package. Confirm actual sound after activation, original media and IDs, saved settings, hidden/deleted/reordered slide behavior, and no private notes/history in public playback/booth. Reimport the editable ZIP and verify authoring/recovery and older audio-free project fixtures. Corrupt/remove an audio asset and confirm a clear refusal without replacing active work.
9. Keyboard-only: attach/replace/remove, disclosure navigation, preview, narration mode, volume, padding, live Enable/Retry/Continue/Mute/Seek/Restart, Presenter and booth. Confirm visible focus, labels and actionable status with the recorded screen reader. Check 1366×768 and a narrower laptop view at browser zoom, light/dark and forced colors; no clipped essential controls or inaccessible error/activation overlay.

For each step record Passed/Failed/Not tested with the exact artifact/environment. A failure is a scoped follow-up, never permission to disable checks. Keep #247 and milestone acceptance open until the actual required evidence is recorded. OBS-specific sign-off is waived by the maintainer; this does not waive actual audio/video delivery evidence.

## Automated coverage boundaries

Synthetic PCM WAV bytes are original fixtures, not spoken-content or sound-quality acceptance. Browser media currentTime/ended assertions establish state and timing. Deterministic controller tests exercise stale callbacks and padding cancellation; ZIP tests inspect and reopen bundled sources offline. Existing legacy/privacy suites stay enabled. CI does not listen to speakers or certify every codec/browser/assistive-technology setup.

See [the audio guide](audio.md), [approved behavior and compatibility](audio-contract.md), [release gates](release-process.md), and independent ongoing evidence #7/#9/#195/#197. Public companion deployment belongs to the separate site repository; no publishing or DNS action is part of this acceptance work.
