# Accessibility audit — 0.2 development

This is evidence tracking, not a compliance certification. Issue #9 stays open until manual screen-reader evidence and remaining workflow checks are complete. The baseline manual pairing is Windows, installed Chrome and NVDA; record actual versions and the tested commit before reporting results.

## Confirmed findings and changes

- Slide move buttons exposed only arrow symbols: add descriptive accessible names without changing their visual layout.
- Editor/project tab panels lacked programmatic tab names and controls relationships: associate existing tabs and panels; the shared Slide/Text panel uses the active contextual tab name.
- Repeated Tab navigation could leave the readiness modal: explicitly wrap forward/backward Tab at the readiness and backup dialog boundaries. Escape still closes the dialog and restores focus. Browser-level navigation remains separate from editor shortcuts.

## Automated evidence

`node --test tests/accessibility.test.mjs` uses actual Tab, Enter, arrows and typing instead of mouse clicks or programmatic focus to reach application actions. It exercises editor entry, text editing, slide movement and undo, editable/JSON export, backup verification, named settings tabs, readiness checks, slide creation, keyboard file-input activation, and clean-profile ZIP import. The import test observes the hidden file input's click with the import button focused and user activation present, cancels the native picker, and supplies bytes through Playwright. This avoids native chooser interception timing in headless Windows; it does not prove real OS picker or screen-reader usability. Main CI run 42428958006 timed out at the previous native chooser event boundary; the failure was not reproduced in ten isolated local Windows runs.

Windows x64 with matching Playwright Chromium passes these tests locally. Installed Chrome is a separate run; test output records its exact version. Existing focus/media-placement/zoom/recovery tests provide additional regression coverage but are not a complete keyboard-only or screen-reader audit. Linux evidence comes from protected PR CI, not the local Windows run.

Browser accessibility-tree inspection confirmed the unnamed arrow controls and missing panel names. Tree inspection and automated keyboard tests do not prove what NVDA announces. No NVDA manual test has been completed; its executable was not found at standard installation locations during this work. Do not mark manual release gates passed from these results.

## Manual evidence checklist

Record date, commit, OS, browser version, NVDA version, display scaling, file/localhost mode, task result, expected versus actual announcement, and any issue/PR reference. Use synthetic or original content. Keep credentials and customer content out of transcripts.

| Task | Expected result | Current manual result |
| --- | --- | --- |
| New presentation wizard | Every step/input has a name; focus follows steps and cancellation | Pending |
| Select, edit and reorder slides | Current selection and move controls are understandable; typing/undo remain predictable | Pending |
| Settings tabs and panels | Tab state and associated panel name are announced; Escape returns to opener | Pending |
| Zoom and media placement | Canvas controls, keyboard nudges, cancellation and selected object are reachable/understandable | Pending |
| Media Focus | Focus stays in overlay; return restores a useful location and playback decision | Pending |
| Readiness report | Status and finding actions are announced; navigation retains destination focus | Pending |
| Backup verification | Picker, progress/errors/results are understandable; cancellation restores focus without altering drafts | Pending |
| Import/export and clean-profile restore | File picker, save/import status and errors are understandable; content survives | Pending |
| Trash/checkpoints/reset | Destructive actions explain consequences; cancel and restore are operable by keyboard | Pending |

Suggested manual procedure: start NVDA and Chrome on the tested build, optionally use NVDA Speech Viewer to record announcements, complete tasks using keyboard only, and record failures before changing code. Run at normal and increased display scaling. Retest any fixed defect in the same pairing. Do not infer NVDA, OBS, audio or other browser support from headless Chromium tests.

Beta requires actual supported-environment evidence, documented gaps and no blocking accessibility defects. RC/stable release plans must link the completed evidence rather than merely link this pending checklist.
