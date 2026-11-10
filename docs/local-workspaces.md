# 0.7.0 — Portable AI authoring, import/export and recovery

Approved revised scope: #119, milestone 0.7.0, merged PR #118. Initial #115/#116 is merged; this revision defers live filesystem access. Feature review passed; separate 0.7.0-rc.1 release preparation is tracked in #120. Direct providers, MCP, containers and collaboration remain outside scope.

## Supported workflow

1. Open **Project → AI presentations → Create / import**. Download the generic instruction pack: instructions, generated schema, capability catalog and examples. No user presentation is included.
2. Give the pack to an LLM of your choice. Generate a complete authoring JSON document. No provider connection, API key or MCP server is needed.
3. Select an individual JSON/editable ZIP file or paste JSON. Validate it, review the inert slide previews, native elements, layouts, placeholders and fit warnings. Use copyable repair instructions for invalid output. Validation does not establish factual accuracy, licensing or readability.
4. Open the reviewed version or an independent copy. AI imports create a new identity; native imports retain IDs unless opened as a copy. A differing same-ID browser version is preserved by the existing previous-local-version mechanism.
5. Edit native elements, add media, reflow through **Project → AI slide layout**, and rehearse. Browser recovery retains content and media in this browser profile.
6. Choose **Export / recovery → Download editable ZIP** to keep content, media and recovery history together. Existing playback export creates an offline viewing copy. Reopen editable ZIPs through Create / import or Presentations → Open file.

## Recovery and compatibility

Browser recovery and downloaded backups serve different purposes. Browser data can be cleared or unavailable in another profile, origin, device or browser. Export an editable ZIP before moving environments or clearing data. Downloads use the ordinary browser download flow and do not establish a file link or overwrite the imported original through Studio. To load external edits, import the updated file and review it first.

Existing project/slide/section IDs, formats, media/history, legacy imports and offline exports remain supported. Authoring v1 is an input format; editable schema-v2 ZIP is the lossless storage format. Studio does not rewrite AI source JSON. JSON alone cannot carry media bytes: use the complete editable ZIP for media projects. The legacy editor import still allows incomplete media for readiness diagnostics and repair.

No saved projects, user files, old workspace preferences or stored handles are deleted. The runtime no longer reads or writes the old workspace-handle database. Remove old browser copies through Presentations → Remove local copy after switching away.

## Import boundaries

Files are validated before changing the active project. Limits remain 100 MB input, 20 MB native JSON, 2 MB authoring JSON, 1,000 ZIP entries and 200 MB streamed expansion. Reject traversal, unsafe asset paths, unexpected archive entries, prototype keys, excessive nesting, unsupported versions and unsupported authoring fields. Import resolves only bundled ZIP assets or existing browser assets where explicitly allowed. It never follows arbitrary filesystem paths, fetches external assets, executes imported HTML or runs displayed commands. Error messages remain untrusted text.

## Deferred live filesystem work — #117

Folder connection/reconnect, directory browsing, linked-file save/reload, native save pickers and folder snapshots are deferred outside 0.7.0. They are absent from the shipped UI, rather than release dependencies. No browser security settings need to be weakened.

Chrome 157 on Windows rejected showDirectoryPicker with AbortError: The user aborted a request after a reported real folder selection. This reproduced on localhost in a secure, focused, top-level page with an active user gesture, including a minimal standalone page without Studio code. No root cause was established; this revision does not claim to fix that API failure. Firefox reported live folder access unavailable.

Unbundled developer source tools/folder-picker-probe.html remains for future research and is excluded from product distributions. It reports context/errors without reading content, enumerating directories or storing handles. Reintroduction requires separate approval, real browser evidence and explicit permission, conflict, interrupted-write and recovery acceptance criteria.

## Final manual checklist

- Test the new build in Chrome and Firefox; record OS/browser versions. There should be no folder picker, linked-save/reload or snapshot controls.
- Download the instruction pack; generate a deck using several LLMs, including one without browsing/download support. Validate, repair and review layouts, citations, notes and reading order.
- Check native text/widgets/tables/code editing, movement, resizing, removal, layout overrides, reflow, locks and Undo. Inspect long titles, crowded slides and small screens.
- Import existing JSON and a complete editable ZIP. Invalid/truncated/future-format input must leave current work intact. Export a media/history project and restore the ZIP in a clean profile; verify offline playback and legacy import.
- Reload and exercise browser recovery separately from ZIP restoration. Confirm keyboard and screen-reader behavior; record exact versions/results.

Automated tests do not establish manual accessibility or LLM output quality. Feature acceptance passed. Release gates and publication are tracked separately in the 0.7.0-rc.1 validation record.
