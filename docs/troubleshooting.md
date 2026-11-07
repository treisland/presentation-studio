# Troubleshooting

See [media compatibility evidence](media-compatibility.md) for exact fixture encodings, tested browser workflows, reproduction commands and pending manual checks.

| Symptom | Action |
| --- | --- |
| Changes disappeared in another browser | Browser drafts are local. Export/import an editable ZIP for handoff. |
| Media missing after JSON import | JSON contains paths, not media bytes. Import the complete editable ZIP. |
| Re-export reports missing assets | Import the editable ZIP containing recovery and Trash assets before exporting again. |
| A slide is absent from playback | Check slide visibility, section visibility, and the selected kiosk loop. |
| Content reaches the footer | Shorten content, use another layout, or divide it across slides. The preview flags overflow. |
| A command does not execute | Commands are shown and copied only. Run reviewed commands in your own controlled environment. |
| Video autoplay fails | Prefer MP4/WebM and muted playback; confirm codec/browser support and test OBS locally. |
| Browser test cannot find Chromium | Run `npx playwright install chromium`, or set `CHROMIUM_EXECUTABLE_PATH`. |
| New project has vendor content | Open the neutral distribution or choose New project → Blank. Use Studio demo for the generic walkthrough; product presentations are opened through their exported ZIPs. |
| Browser recovery unavailable with file URLs | Export a ZIP and optionally use `npm run serve` for a stable localhost origin. |

Do not reset the browser profile to fix draft problems until you have exported the current editable project.

## Backups and recovery

Saved locally means the browser draft was written; it does not protect against clearing browser data or losing the device. After an editable ZIP export, the editor reports that a ZIP was created this session. Keep the downloaded file. Text, settings, media and recovery-history changes make that ZIP out of date. Playback ZIP and JSON exports do not count as complete editable backups. Reopening a project starts a new session with no verified backup freshness.

To verify a backup, open its complete editable ZIP in a separate browser profile and confirm slides, notes and media. Keep the original profile until verification succeeds. On a local save failure, leave the active editor open and export an editable ZIP.

## Browser media checks

Use the Playwright browser matching the installed dependency (`npx playwright install chromium`) for the reproducible automated baseline. Installed Chrome can be tested separately with `CHROMIUM_EXECUTABLE_PATH`. A timeout alone does not identify a playback defect. Media readiness failures in focus and visual tests include browser identity, codec capability, source, readiness, network state and media errors.

The Windows matching-Chromium suite passes, including generated WebM playback and focus continuity. Installed Chrome and OBS still require separate verification. Do not treat Linux CI success as an OBS or codec compatibility guarantee.

| Environment | Verification required | Status |
| --- | --- | --- |
| Windows / matching Playwright Chromium | Full authoring, offline export/reopen, generated WebM focus | Automated suite passed during 0.1.3-alpha preparation |
| Linux / matching Playwright Chromium | Same regression suite | CI configured; next run pending |
| Windows / installed Chrome | Repeat media tests and record browser version | Manual verification pending |
| OBS Browser Source | Unzip playback ZIP, open local index.html at 1920×1080, verify video, focus and looping | Manual verification pending |

For each manual check, record OS, browser/OBS version, media container and codec, muted/autoplay settings, file versus localhost opening, and pass/fail. Test an actual delivery video as well as the bundled offline image.

## Keyboard authoring checks

Project settings focuses Back to canvas on open, keeps Tab navigation inside settings, and returns focus to Project settings on close or Escape. Editor controls show a visible keyboard focus outline. At 1366×768 and 1280×720, compact columns preserve canvas space and action rows wrap. Keyboard regression coverage exercises settings navigation and reachability at both sizes; a screen-reader review remains a manual check.
