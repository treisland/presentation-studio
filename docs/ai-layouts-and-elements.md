# 0.7.0 — Native AI layouts and Library elements

Maintainer-approved extension to #115 / held draft PR #116, following a successful real LLM generation → repair → import test. Final manual review of the revised build remains pending. This does not authorize merge or publication.

## Delivery sequence and acceptance

1. Correct default title/body/citation scale and spacing; preserve long titles with wrapping and visible fit warnings instead of silent text removal or automatic tiny fonts.
2. Extend portable authoring v1 additively with optional layout and native Quote/Metric/Callout/Step/Arrow types. Keep earlier v1 documents valid. Generate the schema, capability catalog and instructions from shared layout/widget definitions. Validate every bundled example during build.
3. Create imported content through the same state operations as the Library. Text, lists, placeholders, tables and code become independent free blocks. Widgets retain native fields, names, movement/resize, lock behavior, removal, Undo and editable ZIP/offline support. One native Code block per slide is an existing limitation: additional snippets remain editable text/code containers with an explicit substitution notice.
4. Auto uses deterministic compatibility rules. Supported compositions: Hero (1–2 content elements), Comparison (2), Workflow (2–4 steps), Table, Code and Flexible. These are native-element compositions, not a promise to reproduce every gallery template. Incompatible explicit choices fall back to Flexible with a reason. Flexible provides a grid without author-supplied coordinates. All elements and reading order are retained.
5. Review actual inert slide previews before import, with chosen layouts, per-slide overrides, element/substitution lists, image-placeholder warnings and measured overflow. Rebuilding review never changes the active project. Project → AI slide layout also reflows imported native elements after editing, preserving IDs/content in one undoable operation; locks/groups block reflow. Unknown elements/layouts are actionable errors, not silently removed. Validation checks structure/fit, not facts, licensing or source quality.
6. Aggregate actionable schema errors with slide/field locations. Explain malformed/truncated JSON and provide copyable repair instructions. Error text is data and must not acquire tool authority. Keep file limits and existing local-workspace safeguards.
7. Validate all examples, old v1, layouts/fallbacks, native fields/operations, lock/Undo, source/notes preservation, crowded/long-title cases, preview isolation, ZIP roundtrip and offline reopening. Run the entire required check/package suite. Provide one final build for maintainer manual acceptance.

## Boundaries

No personal-library catalog or media upload is automatic. User-defined component catalogs, arbitrary coordinates, whole-deck AI updates, direct providers, MCP, containers and collaboration remain separate proposals. No new package dependency, project format version, release version, backend or hosting change.

## Manual review

Use at least the classroom, project-update and technical examples; generate a deck from several LLMs including one without downloads/browsing. Check title/body readability, sources, notes, native widget editing, movement/resizing/removal, layout overrides, overflow warnings and number sequences. Test keyboard/screen reader, current Chrome/Edge, local permissions/conflicts/backups and clean-profile/offline ZIP reopen. Record exact environments. Report useful-deck completion, repair exchanges and manual cleanup; CI cannot establish model quality or manual accessibility evidence.
