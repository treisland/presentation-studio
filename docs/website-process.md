# Companion documentation and image maintenance

Issue #193. Follow the [companion charter](companion-site-charter.md). The maintainer
approved local implementation/review; public hostname, hosting and launch remain
deferred. No content PR enables public publication implicitly.

## Updating content

1. Identify affected canonical guides under `docs/` and public screenshot scene IDs.
2. Edit canonical guides once. The explicit companion page manifest selects user
   content; operations/contributor documents remain separate. Preserve existing
   relative guide links, `docs/images/` references and offline package paths.
3. Describe the target app channel/version/SHA independently of the content commit.
   Stable defaults require approved stable artifacts. Beta/development claims stay
   labeled, including local review screenshots. Do not use package.json alone as
   proof of a promoted build.
4. Build local candidates into ignored companion output. Never overwrite `site/`,
   canonical app assets, distribution receipts or the five-path review ZIP contract.
5. Run link/asset/provenance checks, review actual rendered pages and images, then
   record remaining manual limitations in the PR.

## Images and provenance

The scene set is editor overview, examples gallery, Media Focus, AI import preview
and finished playback. Use clean original fixtures, fixed capture settings, settled
fonts/assets and disabled animation. Capture supported scenes only. Keep ignored raw
captures and derivatives separate; an annotation/crop records its source image hash.
Candidates are not committed or published automatically.

Each image manifest entry records scene ID, artifact version/channel/SHA and digest,
fixture, viewport/scale/theme, capture command, image SHA256, meaningful alt text,
consuming page IDs and human review status. Agents may produce candidates; the
maintainer accepts public imagery and claims. Review legibility, clipping, stale UI,
neutral licensed content and truthful capability descriptions. Do not substitute
illustrative mock-ups for authentic app captures.

UI changes must name affected scenes, or explain why existing imagery remains
accurate. For each release, record **refreshed**, **reviewed and still accurate**, or
**pending** against each supported scene with target identity and reviewer evidence.
Automated image generation/capture success alone is not human visual acceptance.

## Checks and ownership

| Change | Required checks |
| --- | --- |
| Guide/prose-only | `npm run build`, `npm test`, `git diff --check` |
| Capture, local builder, renderer, packaging or workflow | `npm run check`, `npm run package`, focused link/image/provenance/output-isolation checks and `git diff --check` |
| Public launch proposal | Above plus explicit hosting/hostname/publishing approval and recorded rollback/launch acceptance |

Agents implement assigned issues through small codex/ PRs, update Unreleased and
state actual checks. The maintainer owns product claims, manual first-user/mobile/
screen-reader/image review and any public launch authorization. Keep those pending
when unperformed. Implementation assignment does not grant DNS or service adoption.

## Rollback and separate publication

Local rollback rebuilds a previous content commit against its recorded app artifact
and image manifest. Verify content identity, links and output isolation; application
release identity and browser recovery remain untouched. Public rollback procedures,
environment permissions and immutable inputs must be approved with the separate
launch policy before a publishing workflow exists. A later content correction may
publish independently only under that explicit policy. App promotions continue to
use their existing release-plan, exact-commit, workflow and artifact gates.
