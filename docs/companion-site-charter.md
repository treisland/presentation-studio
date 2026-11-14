# Companion site charter

Issue #192, consolidated v0.16.0. The maintainer assigned implementation and chose
**build locally; decide publishing later** on 2026-11-12. This is the architecture
and local-review contract. It authorizes no live deployment, DNS or hosting changes.

## Audience and outcome

Help a new visitor understand portable editable presentations, choose a useful
example, make a small edit, export an editable ZIP, reopen it and present offline.
Use the direction “Create in your browser. Present anywhere.” Explain that a browser
draft is local convenience, not a portable backup. Distinguish editable and playback
ZIPs at the point of download. No unsupported compatibility or accessibility claim.

## Ownership and source boundaries

- `website/` owns authored presentation/layout/navigation and its explicit page map.
- `docs/` remains canonical for task guides; render selected guides from those files,
  without maintaining second copies. Contributor operations are secondary navigation.
- `examples/` and existing template fixtures own original editable examples. Reuse
  Studio and Portfolio; use the existing Newsletter collection as the third initial
  example. Describe actual menus for opening independent copies; invent no deep links.
- A new local builder writes only an ignored companion-preview output directory,
  never `site/`, app `dist/`, canonical release assets or existing deployment receipts.
- The maintainer owns public claims, image acceptance and any eventual launch.
  Agents update scoped source, provenance and validation through linked codex/ PRs.

## Local information architecture

| Area | Content |
| --- | --- |
| Home | Purpose, actual released UI, Open Studio, Explore examples, Create/Export/Reopen |
| Examples | Studio, Portfolio, Newsletter; purpose, authentic preview, independent-copy steps |
| Start here | First-success guide with editable backup and offline playback |
| Create | Media, branding, layouts and existing authoring workflows |
| Present | Playback, Media Focus and supported delivery limitations |
| Portable AI authoring | Offline instruction/schema workflow; no live provider claims |
| Save & recover | Editable ZIPs, reopening, browser drafts and recovery |
| Reference | Explicitly selected user guides and import compatibility |
| Releases/downloads | Stable default and separately labeled beta links |

Use relative links for rendered local guides/assets. Preserve packaged `/docs/`
paths and existing offline documentation. Companion rendering must neither change
the application's entry points nor change the existing five-path review extraction
contract. A local companion is a documentation preview, not a replacement app shell.

## Channel and identity contract

Record content commit separately from app version, app SHA, channel and artifact
digests. Stable claims and screenshots require the selected approved stable artifact;
beta/development material is explicit and cannot masquerade as stable. A source
package version alone is not release evidence. Manifest-selected local screenshots
must identify the actual captured artifact and original fixture.

The five scene recipes are editor overview, examples gallery, Media Focus, AI import
preview and finished playback. Start with three supported scenes and add the other
two only when the target channel supports them. Fix viewport/device scale/theme,
disable motion, wait for ready assets/fonts and use clean original content. Manifest
records scene ID, target identity, fixture, command/configuration, SHA256, alt text,
consuming pages and human review state. Candidate raw images are ignored; reviewed
images are committed deliberately, not automatically. Crops/annotations are separate
derivatives with parent hashes. UI changes identify affected scenes and user guides.

## Origins and publication boundary

Read-only routing observation on 2026-11-12: `https://pres-studio.com/` returned 200;
`https://www.pres-studio.com/` redirected to that stable origin; beta returned 200 at
`https://beta.pres-studio.com/`. Therefore www is not an unused companion hostname.
These observations are evidence of current routing, not permission to reconfigure it.

Preserve stable/beta app URLs, browser storage/recovery and verified app HTML bytes.
The maintainer confirmed on 2026-11-13 that https://docs.pres-studio.com/ is public,
with deployment handled by treisland/presentation-studio-site. Preserve that separate
ownership; this app repository supplies canonical content and capture tooling,
not implicit authority to change DNS or deployment. Local preview rollback rebuilds
an earlier content commit against its recorded app artifact and does not roll back
the app or drafts.

## Acceptance after launch

#193/#194/#196 are implemented. #195 and #197 remain open for independent first-user
and accessibility acceptance under ongoing validation milestone 25. Public launch
is confirmed, while public provenance still records fresh-user observation and
screen-reader review as pending. See [milestone reconciliation](milestone-reconciliation.md).

Documentation-only PRs run build, unit tests and diff checks. Build/capture/workflow
changes run the full check and package commands plus focused link, provenance and
output-isolation tests. Record results and pending manual work in each linked PR.
Release preparation and all existing app protections remain unchanged.

Accounts, collaboration, analytics/tracking, live AI providers, app-origin migration,
new project formats, external services and unapproved dependencies are outside this
companion workstream. Customer content and the generated mock-up photos are not fixtures.
