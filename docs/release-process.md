# Development and release process

## Sources of truth

The roadmap describes Now/Next/Later. GitHub issues hold scope, acceptance criteria, risks, and validation. Milestones define a release's scope; their issues are its delivery board until GitHub Projects access is configured. CONTRIBUTING.md is the contributor entry point; AGENTS.md applies the same rules to coding agents. CHANGELOG.md records shipped behavior and pending changes.

## Versions and readiness

Use MAJOR.MINOR.PATCH. Backward-compatible features increment MINOR; fixes increment PATCH. Breaking changes need explicit migration and compatibility review (before 1.0, signal these with a minor increment). Version 1.0 commits to documented project-format and core-workflow compatibility. Stable 0.x releases still state their support scope explicitly.

For 0.2 use 0.2.0-alpha.1, alpha.2, beta.1, rc.1, then 0.2.0. Alpha scope can evolve. Beta freezes features and requires supported-browser, keyboard, recovery, media, and accessibility evidence. RC requires no open release blockers and final artifact checks. Stable requires the RC evidence, known limitations, and recovery instructions. Patch releases contain fixes; new features target the next minor. Previously published unnumbered alpha tags remain historical.

## Issue to pull request

1. Propose a user problem, in/out scope, acceptance criteria, validation, dependencies, and compatibility risks.
2. A maintainer assigns a milestone and labels complete, approved work agent-ready. Ready issues are actionable; blocked issues are not.
3. Implement on a feature branch, link the issue, test, and update docs/changelog. Draft PRs remain outside automatic merging.
4. Ready PRs require both Windows and Linux validation, an up-to-date branch, and resolved conversations. No admin bypass, force push, or branch deletion is allowed on main.
5. The delivery heartbeat enables native GitHub auto-merge for non-draft main-targeting PRs authored by the repository owner or approved with auto-merge by a maintainer. hold blocks automation. External contributions need maintainer scope approval before receiving auto-merge. GitHub enforces required checks at merge time. Outstanding changes-requested reviews are never bypassed.

No approving review is mandatory for the current solo-maintainer workflow; review remains available and conversations must be resolved. Add required approvals when another maintainer is available. Automation must not grant itself approval labels on unapproved contributions.

## Release contract

Routine feature PRs do not publish. A release preparation PR aligns package.json, package-lock.json, README version, CHANGELOG.md and release-plan.json, and adds focused notes under docs/releases/. Merging this explicit plan authorizes its version for automatic publication after gates pass. Never reuse a published version or move an existing tag.

The delivery heartbeat runs scripts/delivery.mjs --apply from a clean checkout of main. Without --apply it reports intended actions. It first queues eligible PRs, then examines main independently. A release requires successful Windows/Linux checks on the exact main SHA, a matching approved release plan and package version, valid release notes, and no open release-blocker issues. Beta/RC/stable additionally require recorded manual gate evidence in the plan. The script creates a lightweight vVERSION tag on that validated SHA through GitHub's API; the tag workflow rebuilds and tests before creating a draft.

On a later run, the script discovers drafts through authenticated paginated release listings and retrieves the matching release by ID. It verifies the immutable tagged commit's validation and successful tag workflow, and exactly four expected nonempty uploaded artifacts with digests. Main may advance, but the tagged commit must remain its ancestor and the current release authorization must match the tagged plan. Notes come from the tagged commit, never newer main content. Changed or cancelled plans require review; tags are never moved. The script publishes alpha/beta/rc as prereleases and stable as a normal release. Publication never runs on a failed or pending workflow. Subsequent runs do nothing for an already published version. Missing drafts, discovery failures and invalid artifacts produce distinct diagnostics.

Local heartbeat runs need the Codex app's scheduling environment, GitHub CLI authentication with repo/workflow scopes, and network access. Native auto-merge continues on GitHub once queued. If the local environment is unavailable, release processing resumes at the next successful heartbeat; it is not a hosted always-on service. Authentication or CI failures are actionable notifications, not reasons to weaken gates. No periodic notification is needed when unchanged.

## Recovery and operations

Linux validation and release builds share the version/digest-pinned Playwright image in `.github/playwright-image.json` and Node 22. Treat the package, lockfile and image as a matched toolchain; upgrade them together through a protected PR. The automated guard rejects drift. See CONTRIBUTING.md for local Linux reproduction. Keep the required Windows/Linux check names unchanged, run native Windows validation independently, and retain full check/package and artifact gates. Container success is not publication or downstream deployment evidence. Registry/npm connectivity is still required; do not bypass gates if it fails.

Use hold on a PR to stop future queuing and disable any already-enabled auto-merge with gh pr merge --disable-auto. Pause the heartbeat to stop release processing. To cancel an unpublished release, merge a plan with publish=false before tagging; if already tagged, leave the tag immutable and keep the release draft. Never overwrite published artifacts: fix forward with a patch version. If checks fail, investigate and submit a focused PR; do not repeatedly rerun deterministic failures.

If delivery reports HTTP 404 while reading repository settings, distinguish an invalid API path from missing authentication or repository access. The repository-root endpoint has no trailing slash. Verify a read-only request before retrying delivery; keep all protection and publication gates enabled.

## Manual release gates

Record evidence links and results for supported browsers/OS, a real delivery video, OBS if claimed supported, keyboard authoring, screen-reader review, clean-profile editable ZIP restore, offline playback, and legacy import. Do not imply these passed from CI alone. Beta/RC/stable plans must list evidence for each gate and mark manualGatesPassed=true only after completion. Any unsupported environment must be stated in notes.


## Companion content review

Record each supported screenshot scene as refreshed, reviewed-and-still-accurate, or pending, with its app channel/version/SHA and provenance. Follow [the website process](website-process.md). Companion public launch remains deferred; app release authorization does not publish companion content.

## Additional distribution channels

Docker/GHCR and Pages are downstream distributions, not release authorization. Tagged plans must explicitly list distribution targets/channels. Use the manual Distribute approved release workflow after canonical publication; never deploy a prerelease to stable. Preserve the existing four-asset contract. Isolated review previews may use successful owner-PR artifacts without publishing a release; they remain development builds, pending manual acceptance. See [deployment, Namecheap DNS and recovery](deployment.md).
