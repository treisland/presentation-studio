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

On a later run, the script verifies that the tag still points to the planned SHA, the tag release workflow succeeded, and the draft contains exactly the four expected nonempty uploaded artifacts. It then replaces draft notes with the approved version-specific notes and publishes; alpha/beta/rc are prereleases, stable is a normal release. Publication never runs on a failed or pending workflow. Subsequent runs do nothing for an already published version.

Local heartbeat runs need the Codex app's scheduling environment, GitHub CLI authentication with repo/workflow scopes, and network access. Native auto-merge continues on GitHub once queued. If the local environment is unavailable, release processing resumes at the next successful heartbeat; it is not a hosted always-on service. Authentication or CI failures are actionable notifications, not reasons to weaken gates. No periodic notification is needed when unchanged.

## Recovery and operations

Use hold on a PR to stop future queuing and disable any already-enabled auto-merge with gh pr merge --disable-auto. Pause the heartbeat to stop release processing. To cancel an unpublished release, merge a plan with publish=false before tagging; if already tagged, leave the tag immutable and keep the release draft. Never overwrite published artifacts: fix forward with a patch version. If checks fail, investigate and submit a focused PR; do not repeatedly rerun deterministic failures.

## Manual release gates

Record evidence links and results for supported browsers/OS, a real delivery video, OBS if claimed supported, keyboard authoring, screen-reader review, clean-profile editable ZIP restore, offline playback, and legacy import. Do not imply these passed from CI alone. Beta/RC/stable plans must list evidence for each gate and mark manualGatesPassed=true only after completion. Any unsupported environment must be stated in notes.

