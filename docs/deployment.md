# Distribution and deployment — 0.10.0

Issue #130 / milestone 0.10.0 implements the maintainer-approved Docker and GitHub Pages plan. Manual acceptance is pending on the isolated review deployment. This feature does not choose or publish another application version. npm publication, server storage, accounts and grouping are outside this milestone.

## Destinations and authority

| Destination | Purpose | Authorization |
| --- | --- | --- |
| `https://pres-studio.com/` | Stable app, `/docs/` help | Published stable release and explicit distribution dispatch |
| `https://beta.pres-studio.com/` | Beta/RC or clearly marked development review | Separate deployment repository and verified release/CI artifact |
| `https://treisland.github.io/presentation-studio-beta/` | Initial review URL before DNS cutover; use a disposable browser profile | Same beta repository |
| `ghcr.io/treisland/presentation-studio:VERSION` | Versioned Linux AMD64 static application | Published release, plan distribution authorization and successful tag workflow |

The canonical GitHub release keeps exactly four existing assets. No fifth manifest, npm tarball or image is attached. Distribution receipts live in the website (`distribution.json`) and workflow artifacts. Pages and Docker use the same verified HTML bytes. The image runs a built-in Node static server without npm runtime dependencies, as a nonroot user, and is compatible with a read-only filesystem and all capabilities dropped. It has a pinned official base, health check and container vulnerability scan. No presentation directories are mounted.

Main retains strict GitHub Actions Windows/Linux checks, required PRs, admin enforcement and resolved conversations. Additive container CI builds, tests exact payload bytes and scans the actual image. A feature/main merge does not publish or update a channel. No deployment scripts run from imported presentations or downloaded PR code.

## Build identity and imports

The build embeds package version, actual Git commit, channel, modified-source status and accepted format versions. Exact clean version tags identify releases; other builds are explicitly `development`, even when package.json still names the last released beta. Identical source state builds deterministically without timestamps. Source archives without Git are development/unknown. `dist/version.json` matches both HTML entry points.

The Presentations screen footer and editor status bar open About; Project → About is always available while authoring. About includes import compatibility and diagnostics copied only after a user action. Diagnostics contain version/channel/commit/formats/browser, not project content, identity, filenames or local paths. They work offline, with selectable text if clipboard access is unavailable. Authoring version controls do not appear in audience playback exports. Embedded build identity remains in those files for diagnosis.

App versions differ from file-format versions. Current imports are native editable project v2, existing legacy v1 import, portable authoring v1 and component library v1. No existing support is removed. Future format changes must test the current and previous generation, record migration/fixtures, reject unknown future formats without changing current work and announce any older-format retirement with recovery instructions. See [compatibility](import-compatibility.md).

## Local Docker review

```sh
npm ci
npm run build
node scripts/site.mjs local
docker compose up --build -d
```

Open `http://127.0.0.1:4173`. Compose exposes only loopback. Stop with `docker compose down`. Server and app data are separate: browser recovery remains in the browser; rebuilding/replacing a container neither backs up nor synchronizes presentations. Download editable ZIPs. Shared network hosting requires explicit port exposure and an HTTPS reverse proxy; authentication is outside this static app. Multi-architecture certification remains deferred until ARM64 is tested.

## Published release promotion

The separate release-preparation PR must explicitly include the intended distribution targets/channels in its existing plan:

```json
"distribution": {"targets": ["pages", "docker"], "channels": ["beta"]}
```

For a stable release use `channels: ["stable"]`. All existing plan flags, notes, evidence, manual release gates, exact-main validation and immutable tag requirements still apply. Old releases lacking embedded identity or distribution authorization are rejected; they are never relabeled or overwritten.

After canonical publication, run **Distribute approved release** on main, supplying `vVERSION`, channel and target. `scripts/site.mjs` verifies the published release, tag ancestry, tagged plan/package, exact-commit platform checks, successful tag push workflow and all four downloaded SHA256 digests. Both HTML identities must match the tagged version and SHA. A prerelease cannot target stable. This explicit dispatch avoids relying on workflow events suppressed when produced with `GITHUB_TOKEN`.

Versioned Docker images publish once. A resumed run verifies existing image revision and exact application bytes instead of overwriting it. Select **promote_alias** only when advancing aliases intentionally: stable gets `stable`/`latest`, beta gets `beta`, RC gets `rc`. Existing aliases are checked for downgrade before mutation. Pin production installations to the recorded OCI digest. Registry auth/network failures stop the workflow. Provenance and SBOM are generated with the image; receipts preserve the digest. Verify initial GHCR package visibility is public before advertising anonymous pulls.

Stable Pages uses the existing source repository `github-pages` environment. Beta Pages uses `deploy/pages-beta.yml` installed as `.github/workflows/pages.yml` in the dedicated `treisland/presentation-studio-beta` repository, with the four referenced scripts copied through a reviewed configuration PR. Use that repository's own Pages token; no cross-repository write secret or long-lived publish token is needed. Release mode accepts only beta/RC. Both workflows serialize promotions and refuse automatic downgrade; stable deployment requires its custom domain to be provisioned first.

For review mode supply the successful source Validate-and-build run ID and exact owner PR head SHA. The trusted deployment workflow checks source workflow identity, same repository, owner-authored open PR, requested-change status, platform/container checks and the archive's GitHub SHA256. Python extracts exactly five static site paths with limits and rejects duplicates, traversal, symlinks, oversized content, changed payload hashes or mismatched embedded build identity. It never checks out or executes PR code. This disposable origin is for manual testing with copies, not confidential or sole project backups. The PR remains held pending maintainer acceptance.

Before the custom beta hostname is configured, GitHub project-site paths under `treisland.github.io` share an origin with other sites on that hostname. A repository path does not isolate browser storage. Use a disposable profile for that temporary review URL and export editable ZIPs before moving to `beta.pres-studio.com`.

## Namecheap domain handoff

The maintainer confirmed Namecheap manages DNS. First verify `pres-studio.com` in GitHub **account Settings → Pages** using GitHub's generated TXT challenge; keep that record. The challenge value is account-generated, never fabricated here. Then set the stable source repository's custom domain to `pres-studio.com` and the beta repository's to `beta.pres-studio.com` when ready to switch from the test URL.

In Namecheap **Domain List → Manage → Advanced DNS → Host Records**, use these records (TTL Automatic is suitable):

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `treisland.github.io` |
| CNAME | `beta` | `treisland.github.io` |
| TXT | GitHub-generated `_github-pages-challenge-…` host | GitHub-generated verification value |

Review existing conflicting parking/redirect/A/CNAME records for only these hosts; retain mail and unrelated TXT records. Do not use wildcard DNS or add repository paths to CNAME values. If Advanced DNS is unavailable, inspect the actual authoritative nameservers instead of changing nameservers blindly. Wait for GitHub's DNS/certificate checks, then enforce HTTPS on each site. Do not enable a custom domain before records/verification are prepared, because it redirects the working GitHub preview URL. DNS was not modified by implementing source code.

Sources checked 2026-11-10: [Namecheap host records](https://www.namecheap.com/support/knowledgebase/article.aspx/434/2237/how-do-i-set-up-host-records-for-a-domain/), [GitHub custom-domain records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).

## Failure, backup and rollback

Publication across GitHub, GHCR and Pages is not atomic. A completed canonical release remains valid when a distribution fails. Record the failed channel and resume only that target after fixing its cause. Never move tags, overwrite a published image version, or bypass protections. Existing matching image bytes mean that step already completed. Authentication errors are not an absent image.

Rollback is a reviewed operation, not the automatic promotion path. Save editable ZIPs first and prove the older app can read current projects/recovery data; prefer a fix-forward release otherwise. Reverting app HTML does not revert IndexedDB. Changing scheme/hostname/port changes browser storage origin; transfer with editable ZIP export/import. Stable and beta remain separate origins. No service worker or automatic update/reload is introduced.

## Manual acceptance

On the deployed review site, open Presentations and the editor; verify version labels, Project → About, supported imports, dark/light appearance, narrow layout and keyboard focus/Escape. Copy diagnostics and check no project/local-path information appears. Import a legacy project and AI authoring JSON; restore an editable media/history ZIP in a clean profile. Export/reopen editable and playback ZIPs offline; playback must show no authoring version label. Test Docker at a stable loopback address, health endpoint, blocked file paths and read-only/nonroot operation where Docker is available. Record exact build/browser/OS and any deployment limitations. Manual acceptance and a separate release-preparation PR are still required before publishing this milestone as beta/RC/stable.
