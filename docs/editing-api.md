# Local editing API v1

Media Grid adds bounded cell and divider operations described in [Media Grid](media-grid.md), using the same atomic revision/lock contract.

`window.presentationStudioEditing` is a local authoring API inside the standalone page. It exposes `version`, `read()` and synchronous `apply(request, {signal})`. It adds no network listener, MCP transport, model calls or credential handling. It is not an authentication/security boundary against other code already executing in the page. Only editable projects outside booth/recovery mode are available. Read results include project content/notes; future transports must add explicit scope and permission checks before exposing them.

## Contract

Call `read()` for a detached `{apiVersion:1, projectId, revision, state}` snapshot. Revisions are opaque session-only tokens, invalidated by UI edits, undo/redo and project changes. Never persist or compare their numeric suffixes. Read-only/unavailable reads throw an error with a `code`.

Call `apply({apiVersion:1, projectId, expectedRevision, operations})`. Operations (1–100) are processed in order on a detached candidate:

- `slide.update`: `slideId`, `changes` containing title (max 500 characters), notes (max 20,000) and/or duration (3–600 seconds). Title changes update the primary heading as in the UI.
- `slide.create`: existing `sectionId`, supported gallery `template`, optional unique stable `slideId`, and `title`. Creates a template-backed slide without changing existing IDs. Unlike the gallery's Q&A convenience action, this contract does not silently create or change sections. It appends to the requested section's loop where applicable.
- `media.place`: `slideId`, optional `objectId` (default `primary`), and normalized `{x,y,w,h}` inside the slide, with minimum width/height 0.05. Moves existing media only; no asset creation/deletion or replacement.

The template set is hero, comparison, workflow, table, qa, code, media, media-grid and blank. Unsupported operations/fields, invalid bounds and unknown IDs fail rather than being silently applied. Same project/slide/object locks and validators are used by UI and API. Title entry reuses metadata validation, gallery creation reuses template model construction, and Free placement uses the batch operation. Remaining legacy editing paths retain their existing lock/undo guards and are migrated incrementally as future operations are added.

## Styling and Layers operations

The additive [styling and precision](styling-and-precision.md) operations use the same version-1 transaction contract. Each accepts `slideId`. Object operations take `keys` (1–100): stable `block-*`/`layer-*` content-root IDs or `media-primary`/`media-object-*` keys. An unedited original root can be addressed by its current `node-N` tree index, bound to the request revision; the operation assigns a stable layer ID without changing the slide ID. Grid media stays within its Grid's identity and cell operations.

- `design.appearance`: `style` with optional `text`, `fill`, `border`, `borderWidth` (0–24). Color values are `null` (inherit), `"transparent"`, `{role,opacity?}` or `{hex,opacity?}`. Roles: background, surface, ink, muted, accent, accentInk, border, secondary. Hex is six digits; opacity is 0–1. One batch can style several roots atomically.
- `design.background`: `color` using the same bounded color representation.
- `design.meta`: `changes` containing `name` (max 80), `hidden`, `locked`, `rotation` (-180–180). Locked targets accept lock-only changes; all other edits are rejected. Grid rotation requires detaching individual media first.
- `design.reorder`: one key, with `direction` forward/backward or `target` key. Background media is pinned; locked layers prevent order changes that would affect them.
- `design.remove`: distinct selected keys; removing a Grid also removes its referenced media while retaining unrelated free media. Repeated keys are rejected before mutation. `design.clear`: all current slide contents/media, retaining slide identity, section and background. Recovery checkpoints and Undo retain removed references; clear rejects locked contents.
- `design.palette`: `colors`, up to 24 `{name,hex}` project swatches (name max 40). Palette entries are reusable custom values rather than theme roles.

Safe normalized `state.design` data is additive to schema-v2 packs. Unknown/unsafe color CSS cannot be executed. API session/revision and view selections/snapping preferences remain outside portable artifacts.

The additive [content-block operations](content-blocks.md) support block.create/place/duplicate/remove for palette-created top-level nodes. They use the same transaction contract and stable IDs scoped to each slide. Active block gestures return BUSY; existing original-layout nodes are not silently converted.

## Atomicity, recovery and conflicts

Validation or cancellation before commit leaves live state, media bytes, checkpoints and undo history unchanged. A successful changed batch creates one undo entry and a bounded **Before editing batch** recovery checkpoint; a no-op creates neither. Operations cannot change asset bytes, avoiding asynchronous file changes during commit. Commit/render failure restores state, history, checkpoints and metadata. No asynchronous boundary occurs during commit; an AbortSignal already aborted is rejected, and cancellation is checked again before commit. Cancellation after the synchronous call returns cannot undo a committed result.

`apply` returns `{ok:true, revision, created, changed}` or `{ok:false, code, message}`. Codes include VERSION, INVALID, NOT_FOUND, READ_ONLY, LOCKED, CONFLICT, BUSY, CANCELLED and COMMIT_FAILED. Revision conflicts require reading again and reviewing a fresh proposal; never silently retry stale work. BUSY requires finishing pending typing, active inline text sessions (even after their debounce saves), media gestures, Focus or exports first. Press Escape or leave inline editing before proposing a fresh batch. Title inputs are validated before opening a typing transaction, so invalid input cannot strand BUSY state or cancel an earlier valid edit's save timer. Failed commits may conservatively invalidate revisions.

Existing schema-v2 project packs, reset baselines, media references and editable/playback exports remain unchanged; no API/session tokens enter portable artifacts. API checkpoints retain the pre-batch project references. Local drafts remain recovery aids; keep complete editable ZIP backups.

## Versioning and future work

Require the integer `apiVersion` explicitly. Incompatible operation semantics require a new major contract; additive operations can extend v1 when older requests retain behavior. The contract excludes arbitrary trees/HTML, generic property paths, lock changes, original-layout deletion, asset uploads, model output and remote access. Block removal is limited to the documented palette nodes. Test legacy imports and offline export/reopen alongside the contract tests; do not treat this local API as a ready-made Hermes/MCP endpoint.
