# Project media and local recording

Milestone 28 / #289. Development alpha; manual browser and audible acceptance pending.

Project media uses the supplied concept: budget header, search/type filters, asset
table, selected preview and usage/actions pane. Open it from Insert → Project media
or Inspector → Sound. Downloads are author tools, not audience permissions.

## Try the alpha

1. Open a presentation in the editor and choose **Insert → Project media**. Search
   or filter the list, select an original, preview it and inspect its assignments.
2. Use **Record narration** directly below the slide canvas, or choose **Record slide narration** in Project media / **Inspector → Sound → Record narration**.
   Select a microphone, record, stop and preview. **Use take** accepts the take;
   **Record / retake** and **Discard take** leave prior narration unchanged.
3. Choose Per-slide narration in Project settings → Audio to use the accepted take.
   Existing narration volume and end behavior are preserved. Undo restores it.
4. In Project media, expand **Replace or locate original**, choose a file and review
   replacement of the selected assignment or all current uses. For missing media,
   check browser recovery first. Folder results are candidates until reviewed.
5. Download an original or choose a media ZIP scope. The ZIP manifest reports
   missing files and original identities. Keep a complete editable ZIP as your
   portable project backup; the media-only ZIP is not a complete presentation.

Save an editable backup from your existing stable build before testing the alpha.
Opening existing files does not rewrite them. Once library metadata is saved, keep
the v6 copy for this alpha and retain the older backup for older Studio builds.

## Canvas narration controls

The strip below the canvas stays outside slide content and exports. With no attached
narration it offers **Record narration**. With an existing track it offers **Play**,
duration and **Record replacement**. During capture it shows a red recording state,
live input level, elapsed time, **Stop** and **Cancel**. After Stop, preview the take
with **Play**, waveform and seek control, then choose **Retake**, **Discard** or
**Use take**. Waveforms are measured from the audio; unsupported/large sources keep
the ordinary transport without a fabricated waveform. Waveform decoding is bounded
to short sources; it does not change original bytes.

The gear menu owns microphone selection, refresh, take download and the shortcut to
Audio settings. Existing narration remains unchanged until Use take. A replacement
preserves volume/end settings and uses one Undo step. Closing the editor pauses
preview and ends microphone access; reopen it to review an interrupted canvas take.
Leaving the slide or Edit blocks mode stops capture. A take stays bound to its
original slide and edit revision: a different slide cannot accept it. Return to the
unchanged original target or download/discard it. Pending microphone permission can
be cancelled; a later permission grant releases its obsolete tracks immediately.

This refinement does not add saved fields or change native v6. The original modal
recording flow remains available from Inspector and Project media. The editor
overview screenshot scene needs fresh human acceptance for this development build;
other existing scenes have no intentional change. The illustrative POC is not
evidence of the implemented interface.

## Storage contract

Existing native v1–v5 projects remain readable. A project with an asset library uses
guarded native v6: `state.assetLibrary={version:1,entries:{[safeAssetPath]:metadata}}`.
Older readers reject v6 rather than dropping retained originals. Existing files are
not migrated until an author stores media-library metadata or accepts a recording.
Metadata contains a bounded display name, kind, origin, actual byte count, optional
SHA-256 and measured duration/dimensions; no filesystem paths or permissions.
Paths remain stable asset identities. Replacement allocates a new identity and
rewrites explicitly selected references; Undo restores the original references.
Renaming changes display metadata only. Originals never change in place.

Editable packs, browser recovery, Undo and checkpoints retain catalog assets,
including unassigned originals. Playback packs remove the catalog and use existing
eligible-reference filtering. Missing originals and unsupported decoding are
separate states. Ordinary remove/replace/download actions preserve recovery assets.
Only the separately acknowledged cleanup operation below can discard eligible
originals and explicitly selected recovery history.

The conservative portable budget is 95 MiB for project JSON plus unique retained
originals, leaving headroom under the existing 100 MiB input cap. Existing oversized
projects remain readable; additions/replacements cannot increase them past this
budget. Archive entry and JSON limits still apply. No automatic transcoding.

## Recording contract

Recording is per-slide and local using MediaRecorder in a secure context (including
browser-dependent file URLs). Detect API/codec support before requesting permission.
Prefer supported audio WebM/Opus, Ogg/Opus or MP4; retain the actual container and
extension. Imported audio WebM is supported without treating it as video.
Each take stops at ten minutes or the available byte budget, with periodic chunks,
an early warning and a reviewable take. A final oversized chunk can make a take
unacceptable; retain it for download rather than silently truncating bytes.
Preview, discard/retake and Use take are explicit. Acceptance is one undoable edit,
preserves narration settings and validates project/slide/revision and locks again.
Changing target, closing the editor/dialog, interruption and page hiding stop tracks
promptly. A stale take can be downloaded/discarded but cannot replace narration.
Permission denial, unavailable devices and unsupported recording produce actionable
messages. Real device/codec behavior requires maintainer testing in Chrome, Edge
and Firefox; Safari and insecure HTTP are not claimed supported.

## Repair and downloads

Usage distinguishes active assignments, inactive attachments, recovery-only and
unused catalog assets. Inspect available recovery bytes before locating originals.
File/folder selection is explicit; no background disk scanning. SHA-256 proves an
exact byte match where a known digest exists. Names and sizes suggest candidates
only; select and review a candidate before replacing one assignment or all current
uses. History remains unchanged. Preview failure does not imply missing bytes.

Bulk downloads choose used or all available assets, preserve extensions, allocate
collision-safe names and include a usage/provenance manifest. Missing files are
listed and require acknowledgement before an incomplete download. Downloads and
preview never remove retained originals. Shared replacements respect slide/object
locks and preserve crop, volume and playback settings.

## Current project and All local projects

**Current project** is the default each time Project media opens. Filter by assigned,
unused or recovery-retained media and sort by largest file. The detail pane explains
Undo, Redo, checkpoint, reset, media-restore and assignment dependencies. Usage buttons navigate to
the affected slides. New recordings use the slide title as their library display name;
downloads retain the original recording extension.

**All local projects** reads saved drafts and media available to this Studio site/origin and browser profile, plus
the current workspace. It does not scan your computer or discover exported files.
Filter by project, inspect usage and originals, download selections or open a project.
Unreadable drafts are reported and left untouched. This view offers no deletion.
Refresh the inventory after another window changes saved drafts.

**Copy to current project** preserves the selected source bytes under a fresh identity
without changing the source project. The copied original can be added as image/video
media or assigned as slide narration. Narration replacement keeps volume/end settings
and existing sources for Undo; select Per-slide narration to use that role in playback.

## Cleanup and deleting media

Select rows individually or use **Select visible**, then download or remove their
current assignments in one Undo step. **Remove from all slides** includes inactive
attachments, respects locks and retains the original bytes. Removal does not free
storage by itself. Original files are shared by references within a project, while
each saved project's browser media keys are independent.

**Review deletion** is a separate permanent action, limited to Current project:

- In-use, inactive and Trash assignments remain protected. Remove their assignments
  or manage Trash through project recovery tools first.
- A genuinely unused original can be deleted without clearing history when no Undo,
  Redo, checkpoint or reset baseline references it.
- To delete a recovery-only original, explicitly choose to clear this project's
  Undo/Redo and checkpoints and replace old presentation/Inspector restore baselines
  with the current state.
  Other originals and all active/Trash assignments remain protected.
- Review the named originals, dependencies and eligible payload size. Download an
  editable backup first, then acknowledge that deletion cannot be undone. The backup
  includes browser-only unused originals in a native-v6 catalog; if it exceeds the
  portable budget, download originals in smaller media selections instead.

Deletion updates the saved project and removes only its selected asset keys in one
IndexedDB transaction. Memory and URLs change only after commit. Interrupted writes
leave originals intact, and a concurrent saved-project change aborts cleanup instead
of overwriting that other version. Current unsaved work remains in memory after a
failure; export it before reopening another saved version. Other projects, component
libraries and exported ZIPs are untouched. Reported savings are original-file payload
bytes, not a guarantee about browser database overhead or physical disk reclamation.

## Identical files and bulk downloads

**Find identical files** compares actual SHA-256 bytes, not filenames. In Current
project, select a canonical original and review consolidation of duplicate assignments.
Settings stay unchanged and one Undo restores the prior references. Originals remain
retained; reclaiming space requires a separate reviewed deletion. All-local results
are informational and cannot consolidate or delete across projects.

Bulk downloads support used, all-available and selected originals. Duplicate names
receive collision-safe suffixes; the manifest includes owning project IDs, usage and
recovery information so identical paths from different projects remain distinguishable.
Missing originals require acknowledgement for incomplete downloads. One media download
is bounded to 900 originals and 200 MiB; choose smaller selections for larger libraries.
No cleanup operation introduces a new saved format, external service or publication.

## Local review

Test microphone permission denial/device removal, actual level feedback and sound,
ten-minute/byte auto-stop, interruption, stale targets, retake/discard/accept/Undo;
duplicate filenames, shared replacements, missing/corrupt files, original hashes,
clean-profile editable restore and offline playback/booth. Review keyboard, screen
reader, light/dark and narrow layouts. Companion scenes: editor overview pending
review; examples gallery, Media Focus, AI import and finished playback have no
intentional UI changes. New Project media/recording screenshots are candidates only;
no public image acceptance or companion deployment is implied.
