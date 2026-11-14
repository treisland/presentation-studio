# Contributing

Use a codex/ feature branch and pull request targeting dev. Promote dev through a reviewed dev-to-main PR; never commit or push directly to either protected branch. Describe the user-visible problem, changed behavior, and validation. Keep customer-specific projects, credentials, proprietary source code, and recordings outside the repository.

## Delivery workflow

Read [the release process](docs/release-process.md) and [roadmap](docs/roadmap.md). Open an issue with user outcome, in/out scope, acceptance criteria, compatibility impact, dependencies, and tests. A maintainer assigns the milestone and marks approved work `agent-ready`. Implement one scoped issue per branch, link it in the PR, and document validation and remaining manual checks. Draft PRs are not merged automatically. Owner-authored ready PRs and maintainer-approved `auto-merge` PRs merge after protected-branch checks pass; `hold` stops queuing. External contributors must receive maintainer approval before automatic merging.

Release preparation uses a separate explicit version and release plan. Feature PRs update Unreleased without choosing a release version. New features increment minor; compatible fixes increment patch. See the release process for alpha, beta, RC and stable gates.

Companion documentation and image updates follow [the website maintenance process](docs/website-process.md). The public companion is https://docs.pres-studio.com/; treisland/presentation-studio-site owns deployment separately.

## Local checks

```sh
npm ci
npx playwright install chromium
npm run check
npm run package
```

Edit source files rather than `dist/`. The runtime files share a single ordered scope; validate the assembled build after edits. Use the browser tests to cover a changed user workflow rather than duplicating implementation details.

### Linux CI toolchain

Linux validation and tagged release builds run the full check/package commands in the same official Playwright image, pinned by version and digest in `.github/playwright-image.json`. The image supplies browsers and OS dependencies; no apt installation runs during tests. Node 22 from `actions/setup-node` is mounted read-only into the container. Windows validation remains native. The full validation matrix has a bounded 30-minute job budget: the expanded native Windows suite reached its final regression at the former 15-minute deadline. No check or packaging step is skipped. Both platform results are required; matrix fail-fast is disabled so an infrastructure failure does not hide the other platform's result.

For local reproduction, use a fresh ordinary clone on Linux/WSL, Node 22 installed with its `bin/` and `lib/` distribution layout, and Docker. From that clone run:

```sh
node scripts/ci-toolchain.mjs --check
node scripts/ci-toolchain.mjs
```

The runner mounts this checkout read/write and runs as your numeric user/group, so outputs remain owned by you. It installs Linux dependencies into this clone's `node_modules`; do not share that directory with a Windows checkout. Linked worktrees with Git metadata outside the mount are not supported for this reproduction. The image pull and npm downloads still require network access. A failure stops the job; there is no retry loop or fallback that skips tests.

When updating Playwright, update the exact package version, lockfile (including playwright-core), and official image version/digest in one PR. Verify the digest against Microsoft's registry. The toolchain guard runs before validation, and unit tests reject version drift or an unpinned image. Run both platform checks, packaging, and review release workflow compatibility before merging. This CI-only image is separate from the shipped application image and does not itself require a product version bump.

## Layout changes

Add or update a layout in `projectCreateTemplate` in `src/runtime/editor.js`, its gallery entry in `src/runtime/studio.js`, allowed import validation, and relevant styles. Ensure text remains editable, defaults fit 16:9, and existing content survives the retain-content option. Add the layout to the sampler and test it.

## Template changes

Use original, neutral sample content in `templates/studio/` and `examples/`. Do not contribute vendor logos, copied documentation, proprietary presentations, or customer material. Examples must be self-contained and validated project packs. Commands are display/copy material; never add execution behavior. See `docs/content-and-branding.md`. Contributions are provided under the Apache License 2.0.

## Review checklist

- Check desktop and laptop layouts, theme contrast, keyboard access, and focus.
- Test editable ZIP export/import and playback reopening after persistence changes.
- Preserve slide and section IDs unless deliberately creating new content.
- Update relevant docs and the changelog.
- Keep third-party notices when changing vendored code.

By submitting original contributions, you agree to provide them under the project’s Apache License 2.0. Third-party material must retain its own applicable license and attribution.
