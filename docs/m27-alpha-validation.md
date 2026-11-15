# Milestone 27 alpha review

Issue #269; branch `codex/m27-start-screen-alpha`.
Foundation: maintainer-accepted menu-bar branch at `a732848` (including accepted
runtime `e3173c0`). The previous milestone acceptance does not stand in for new
start-screen acceptance. The original checkout's pending beta preparation was
left untouched in a separate worktree.

This record describes the development alpha reviewed before beta. Its existing
package version was retained; the review runtime is identified by Git SHA.
During alpha review `release-plan.json` had `publish: false` and PR #270 was
held for maintainer testing. The separate beta authorization now records that
acceptance. No companion deployment is included.

## Maintainer acceptance

On 2026-11-15 (America/Denver), the maintainer reported: “My manual testing passed. This is ready for beta release.” The accepted runtime is `4c25100`, including recovery-safe start-screen actions. This supersedes the local-acceptance hold below; protected integration and release checks remain required. No new environment versions, recordings or artifact hashes were supplied or invented. See [beta validation](releases/0.18.0-beta.1-validation.md).

## Automated and visual evidence

- Focused startup workflows: fourteen browser tests passed, covering first visit,
  theme/narrow layout, navigation without identity/history changes, blank creation,
  recents/save-before-switch cancellation, ZIP opening and invalid import,
  offline editable reopening, all preferences, missing last draft, recovery
  precedence and unavailable storage/database.
- Recovery follow-up: explicit blank/template/example/recent/file actions work
  without recovering or discarding first. Tests compare the original stored
  project, history and media bytes, verify cancellation/invalid import preserves
  recovery, and check same-ID imports keep a previous-local-version copy.
- Existing example setup and legacy/demo regression checks passed separately.
- Existing browser fixtures now explicitly request `?start=present` when their
  initial surface is presentation playback; new startup tests use the default URL.
- Local screenshot candidates under ignored `test-results/start-screen-*.png`
  were inspected by the implementation agent in light, dark and narrow layouts.
  These are development review captures, not accepted companion imagery.
- Initial alpha `npm run check`: passed all 504 tests (48 unit/build, 165 browser,
  173 component, 23 manipulation, 30 Inspector/menu, 46 viewer/presenter,
  19 audio). Windows with Playwright Chromium 151.0.7922.34.
- `npm run package`: passed; the packaged guide is present and the packaged
  editable demo reopens directly offline despite a blank-start preference.
- Initial alpha startup/presenter-browser regression: 12 tests passed.
- Recovery-fix `npm run check`: all 511 tests passed (including 172 browser
  tests). Its 14 focused startup tests, packaging, packaged offline demo smoke
  check and diff check passed. Maintainer retest and updated protected CI remain
  pending; no new release authorization is implied.
- `git diff --check`: passed. Linux CI and maintainer manual review remain pending.

## Local test path

In a clean checkout or separate worktree, fetch and check out
`origin/codex/m27-start-screen-alpha`, install dependencies if needed, then run
`npm run build`. Open `dist/presentation-studio.html` without a query string.
Use a fresh browser profile for the first-visit case. Existing recovery drafts
may intentionally take precedence over automatic startup.

Review [the behavior contract](start-screen.md), then try:

1. Open an existing editable ZIP/JSON and reopen it from Recent projects.
2. Start blank, choose a starter/template, and try the Studio example.
3. Change On startup and reload for each option. The file picker requires a click.
4. Return through File → Start screen; cancel a switch with unsaved work.
5. Export/reopen a project and playback ZIP offline; verify assets and identities.
6. Check keyboard/focus, light/dark, laptop/narrow sizes and browser zoom.

Maintainer local acceptance, physical-input/screen-reader review and any new
beta/release authorization remain pending. Public companion scene review and
authentic start-screen capture acceptance remain pending as described in the guide.
