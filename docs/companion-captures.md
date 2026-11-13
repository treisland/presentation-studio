# Local companion screenshot capture

Issue #194. Follow the [charter](companion-site-charter.md) and
[image maintenance process](website-process.md). Captures are ignored local
candidates. The maintainer reviews images and public claims before any publication.

## Select an immutable input

`website/captures/targets.json` records selected artifact identities independently
of the content commit. The initial target is published stable 0.11.0, resolved to
its immutable tag commit and GitHub asset SHA256 on 2026-11-13. The command rejects
different HTML bytes. It never edits or rebuilds that app artifact. Add a reviewed
target entry through a PR for another stable, labeled beta or development artifact;
do not infer promotion from the source package version. Record the actual build
commit and input digest, and supported recipes, including for development targets.

```powershell
gh release download v0.11.0 --repo treisland/presentation-studio --pattern presentation-studio.html --dir test-results/stable-input
npm run capture:companion -- --target stable-v0.11.0 --input test-results/stable-input/presentation-studio.html --out test-results/companion-captures/review-a
npm run capture:companion -- --target stable-v0.11.0 --input test-results/stable-input/presentation-studio.html --out test-results/companion-captures/review-b --before test-results/companion-captures/review-a/manifest.json
```

Use a fresh output directory each time. Run with the repository's exact locked
Playwright and pinned capture environment. CI’s Linux image/digest lives in
`.github/playwright-image.json`; native Windows review is recorded separately and
is not assumed pixel-identical to Linux. The manifest records Chromium, Playwright,
OS/release/architecture, viewport 1440×960, scale 1, light theme, en-US, UTC and
reduced motion. Fonts/assets settle; animations and carets are disabled. Contexts
are clean and HTTP traffic is blocked. Only the original bundled fixture is used.

## Recipes and review

Three initial recipes use actual supported UI: editor overview on the first slide,
the examples gallery and paused first-slide playback. Media Focus and portable-AI
import preview recipes are listed but deferred until their selected promoted
channel and original fixtures are reviewed. No illustrative mock-up is a UI capture.

`manifest.json` records scene IDs, alt text, fixtures, consuming pages, exact input
and image hashes, content commit/dirty state, capture configuration/command and
pending review. `review.html` presents raw candidates and optional before/after
pairs. A repeated run reports identical/changed hashes; it never replaces old
candidates. Raw `.raw.png` files are distinct from future cropped/annotated/web
derivatives, which must record their parent hash and transformation separately.

Review legibility, clipping, truthful channel labeling, original content and
licenses. Deliberately accept images and their provenance in a later content PR;
the capture command never stages, commits or publishes images. Existing
`docs/images/`, packaged guides, `site/`, app/release assets and distribution
receipts remain intact. A local companion may consume these pending candidates
only with an explicit local-review label. Automated repeatability is not human
image acceptance or a release gate result.
