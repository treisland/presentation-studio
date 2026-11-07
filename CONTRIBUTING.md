# Contributing

Use a feature branch and pull request. Describe the user-visible problem, changed behavior, and validation. Keep customer-specific projects, credentials, proprietary source code, and recordings outside the repository.

## Delivery workflow

Read [the release process](docs/release-process.md) and [roadmap](docs/roadmap.md). Open an issue with user outcome, in/out scope, acceptance criteria, compatibility impact, dependencies, and tests. A maintainer assigns the milestone and marks approved work `agent-ready`. Implement one scoped issue per branch, link it in the PR, and document validation and remaining manual checks. Draft PRs are not merged automatically. Owner-authored ready PRs and maintainer-approved `auto-merge` PRs merge after protected-branch checks pass; `hold` stops queuing. External contributors must receive maintainer approval before automatic merging.

Release preparation uses a separate explicit version and release plan. Feature PRs update Unreleased without choosing a release version. New features increment minor; compatible fixes increment patch. See the release process for alpha, beta, RC and stable gates.

## Local checks

```sh
npm ci
npx playwright install chromium
npm run check
npm run package
```

Edit source files rather than `dist/`. The runtime files share a single ordered scope; validate the assembled build after edits. Use the browser tests to cover a changed user workflow rather than duplicating implementation details.

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
