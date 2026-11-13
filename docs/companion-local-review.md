# Local companion review

Issues #194–#197. This implements the maintainer's **build locally; decide publishing
later** choice. No public hostname, hosting registration, credentials, analytics or
publishing workflow is configured. Existing stable/beta app URLs remain in place.

## Build and inspect

Use the digest-verified stable capture input described in
[Companion captures](companion-captures.md). The companion adds Studio, Portfolio
and Newsletter variants of the examples-gallery scene. Each cropped preview records
its full raw parent image hash and exact region; it is not an illustrative mock-up.

```powershell
npm run capture:companion -- --target stable-v0.11.0 --input PATH-TO-VERIFIED-STABLE-HTML --out test-results/companion-captures/site-review
npm run build:companion -- --captures test-results/companion-captures/site-review/manifest.json --out test-results/companion-preview/review-a
npm run test:companion -- test-results/companion-preview/review-a
npm run serve:companion -- test-results/companion-preview/review-a 4197
```

Open the printed loopback URL. Both builders require new ignored run directories;
they never overwrite a review run or write to `site/`, app `dist/`, release assets
or distribution receipts. The server binds only 127.0.0.1. Stop its terminal when
local review finishes. Rebuild an earlier content commit with its recorded capture
manifest to review rollback; app release/draft origins remain unchanged.

## Source and channel boundaries

`website/content.json` explicitly selects canonical `docs/` guides and the three
existing original examples. Guides are rendered from those sources, never maintained
as duplicate website prose. Linked local media/schema files are copied into the
ignored output; selected guides link locally. Other canonical guides link to the
recorded source commit. Contributor operations remain secondary repository links.
The first-success guide also stays in the ordinary offline app package.

Stable is the default Open Studio link and image channel. Beta is a separately
labeled opt-in app/release destination; v0.16 work remains development. Current
reference and development format/AI guides identify that their availability can
differ from stable. The build validates artifact and image hashes against selected
stable target provenance, including crop parents. All pages show local-development,
unpublished and pending-image-acceptance labels and noindex/nofollow metadata.

`provenance.json` records content commit/dirty state separately from captured app
version/channel/SHA, artifact/image digests and consuming pages. A capture or content
build does not approve screenshots, promote an app, change app HTML bytes, move a
tag, publish a release or establish a new app origin. No account or external service
is needed for the preview; external app/release links intentionally open the real
supported destinations. Offline app packages retain their existing entry points.

## Validation and remaining review

`npm run test:companion -- OUTPUT` checks rendered local links/assets/headings, then
uses the locked browser tooling to review desktop, 768px tablet and 390px mobile
pages, overflow, image decoding, keyboard Skip to content and guide-title search.
Actual output screenshots are ignored under test-results. Full check/package/diff
remain required for builder/capture/packaging changes.

Manual fresh-user observation, screen-reader review, public image/claim acceptance
and physical delivery environments remain explicit acceptance items. Publishing
stays deferred; a future launch needs hostname/hosting authority and an approved
rollback/publishing policy under the [charter](companion-site-charter.md).
