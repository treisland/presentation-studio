# Presentation Studio agent workflow

- Read CONTRIBUTING.md, docs/release-process.md, and the assigned issue before editing.
- Work only on explicitly assigned work or issues labeled agent-ready. The roadmap is direction, not permission to implement every candidate.
- Use a codex/ feature branch and a linked pull request; never push directly to main or force-push shared branches.
- Preserve project IDs, saved-project compatibility, recovery assets, and offline export/reopen behavior. Escalate product scope changes, breaking format changes, major dependencies, or external services to the maintainer.
- Edit source, not generated dist/release output. Keep customer materials and secrets out of the repository.
- Run npm run check and npm run package for runtime/workflow changes. For documentation-only changes, run npm run build, npm test, and git diff --check. Record actual results and remaining manual checks in the PR.
- Update the Unreleased changelog and affected docs. Features increment minor versions; fixes increment patch versions. Prerelease progression uses alpha.N, beta.N, rc.N. Do not bump versions for every feature PR.
- Follow docs/release-process.md for automatic merge/release authority. Do not bypass checks, approvals, unresolved reviews, or release gates. A failed check is not permission to disable it.
- Keep changes small and satisfy all issue acceptance criteria. Leave speculative follow-ups as proposals.

