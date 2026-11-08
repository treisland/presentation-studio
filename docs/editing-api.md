# Local editing API v1

`window.presentationStudioEditing` is a local authoring API inside the standalone page. It exposes `version`, `read()` and synchronous `apply(request, {signal})`. It adds no network listener, MCP transport, model calls or credential handling. It is not an authentication/security boundary against other code already executing in the page. Only editable projects outside booth/recovery mode are available. Read results include project content/notes; future transports must add explicit scope and permission checks before exposing them.

## Contract

Call `read()` for a detached `{apiVersion:1, projectId, revision, state}` snapshot. Revisions are opaque session-only tokens, invalidated by UI edits, undo/redo and project changes. Never persist or compare their numeric suffixes. Read-only/unavailable reads throw an error with a `code`.

Call `apply({apiVersion:1, projectId, expectedRevision, operations})`. Operations (1–100) are processed in order on a detached candidate:

- `slide.update`: `slideId`, `changes` containing title (max 500 characters), notes (max 20,000) and/or duration (3–600 seconds). Title changes update the primary heading as in the UI.
- `slide.create`: existing `sectionId`, supported gallery `template`, optional unique stable `slideId`, and `title`. Creates a template-backed slide without changing existing IDs. Unlike the gallery's Q&A convenience action, this contract does not silently create or change sections. It appends to the requested section's loop where applicable.
- `media.place`: `slideId`, optional `objectId` (default `primary`), and normalized `{x,y,w,h}` inside the slide, with minimum width/height 0.05. Moves existing media only; no asset creation/deletion or replacement.

The template set is hero, comparison, workflow, table, qa, code and media. Unsupported operations/fields, invalid bounds and unknown IDs fail rather than being silently applied. Same project/slide/object locks and validators are used by UI and API. Title entry reuses metadata validation, gallery creation reuses template model construction, and Free placement uses the batch operation. Remaining legacy editing paths retain their existing lock/undo guards and are migrated incrementally as future operations are added.

## Atomicity, recovery and conflicts

Validation or cancellation before commit leaves live state, media bytes, checkpoints and undo history unchanged. A successful changed batch creates one undo entry and a bounded **Before editing batch** recovery checkpoint; a no-op creates neither. Operations cannot change asset bytes, avoiding asynchronous file changes during commit. Commit/render failure restores state, history, checkpoints and metadata. No asynchronous boundary occurs during commit; an AbortSignal already aborted is rejected, and cancellation is checked again before commit. Cancellation after the synchronous call returns cannot undo a committed result.

`apply` returns `{ok:true, revision, created, changed}` or `{ok:false, code, message}`. Codes include VERSION, INVALID, NOT_FOUND, READ_ONLY, LOCKED, CONFLICT, BUSY, CANCELLED and COMMIT_FAILED. Revision conflicts require reading again and reviewing a fresh proposal; never silently retry stale work. BUSY requires finishing pending typing, active inline text sessions (even after their debounce saves), media gestures, Focus or exports first. Press Escape or leave inline editing before proposing a fresh batch. Title inputs are validated before opening a typing transaction, so invalid input cannot strand BUSY state or cancel an earlier valid edit's save timer. Failed commits may conservatively invalidate revisions.

Existing schema-v2 project packs, reset baselines, media references and editable/playback exports remain unchanged; no API/session tokens enter portable artifacts. API checkpoints retain the pre-batch project references. Local drafts remain recovery aids; keep complete editable ZIP backups.

## Versioning and future work

Require the integer `apiVersion` explicitly. Incompatible operation semantics require a new major contract; additive operations can extend v1 when older requests retain behavior. This first contract deliberately excludes arbitrary trees/HTML, generic property paths, lock changes, deletion, asset uploads, model output and remote access. Canvas blocks #12 and additive media #11 can add reviewed operations later. Test legacy imports and offline export/reopen alongside the contract tests; do not treat this local API as a ready-made Hermes/MCP endpoint.
