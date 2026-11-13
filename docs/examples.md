# Starting from an example

Choose **Project → Start from an example**, the matching action in Recent presentations, or **Start from an example** beside the Blank/Import choices in New presentation. The gallery provides three core starter/demo pairs, two lightweight starters and the original eight-slide Studio demo. Individual examples are not duplicated in New presentation. Creation makes a separate project; collection copies also receive fresh slide identities. Starting another presentation uses the same save-before-switch guard as Blank and Import; browser recovery is not a replacement for an editable ZIP backup.

Filter by purpose and image layout, then Preview a collection. Previous/Next visits every slide; Preview content switches between prompts and finished content where available. **Read preview text and image descriptions** exposes the same content in a text view. Previews do not change the active project or history. Close/Escape returns to the entry control or Project menu. Use starter / Use demo continues to naming and appearance setup after the existing work can be saved. Create presentation or Use defaults then creates the separate copy. Closing setup, cancelling save-before-switch or a failed save keeps the current project. Unavailable artwork disables the affected demo and leaves other available starters/examples usable.

| Collection | Slides | Starter | Finished example |
| --- | --- | --- | --- |
| Portfolio | 5 | Problem, process, results, gallery and credits prompts | Fictional library design study, with evidence/limitations and four original diagrams |
| Comic | 4 | Opening, numbered sequence, explanation and takeaway prompts | Original seed-sharing story with editable speech, six image placements and captions |
| Editorial | 5 | Newspaper cover, blog lead, columns, image feature and closing prompts | Fictional Community Notebook with original diagrams and source credits |
| Newsletter | 4 | Lead, recurring update cards, curated reading and closing | Lightweight starter only; no finished-demo claim |
| Flyer | 3 | Event, announcement and portfolio-cover prompts with replaceable original artwork | Lightweight starter only; no finished-demo claim |
| Studio | 8 | No separate starter; use Blank instead | Original generic Studio demo, including sample media, commands and a searchable question |

All are **16:9 slides**. Newsletter does not mean email HTML or sending. Flyer does not mean print-ready dimensions, bleed, CMYK, PDF or portrait output. Editorial does not mean scrolling web articles or hosted publishing.

## Customize and recover

**Project → Editor walkthrough** opens optional Portfolio, Comic or Editorial help. Next/Previous and Replay only change the help view; you choose and perform each editor action yourself. Skip guide, Close or Escape while focused in the guide dismisses it and restores focus to a reachable entry control. The guide does not open automatically, change slides or alter project history. It closes when switching projects or leaving the editor, respects reduced motion, and never becomes slide content or an active exported overlay.

Text, speech, captions, image descriptions and credits stay editable. Themes and project swatches determine appearance. Image slots use the existing Media Grid controls for Fit/Fill and independent crop. Missing visuals are explicit editing targets; long text is flagged without being auto-shrunk.

Use **Project settings → Recovery & reset → Reset entire presentation** to restore the starting content of your copy. Confirmation names what is replaced, a checkpoint retains current work, and Undo can recover edits. The reset baseline stays with the project, including after repeated resets and editable ZIP reopening. Resetting your copy does not change the immutable library example or another browser draft.

## Original content and assets

Included examples are original neutral writing and artwork licensed under the project’s Apache License 2.0:

- `portfolio-library.svg`, `portfolio-signs.svg`, `portfolio-workshop.svg`, `portfolio-plan.svg`: fictional library journey, sign concept, workshop and follow-up plan.
- `comic-seed-1.svg`, `comic-seed-2.svg`, `comic-seed-3.svg`: original seed-sharing story illustrations. Speech/captions remain separate editable content.
- `flyer-gathering.svg`: an undated, replaceable gathering illustration.

They represent no real participant, organization or measured outcome. Credits and meaningful image descriptions are included; replace them appropriately when using your own materials. Original resources are embedded for offline use and included when referenced by editable/playback ZIPs. User-imported material keeps its own license and attribution obligations.

Each new example receives fresh asset paths copied from the bundled originals. An imported file with the same filename cannot substitute artwork into the library or cause the prior project's cached/draft asset to be overwritten.

## Validation and review

Editorial mastheads have a dedicated retained-content destination. Changing to a composition without a masthead keeps the text as ordinary retained content instead of carrying absolute masthead placement into the article. Library previews reserve space for captions. For visual guide steps, choose the intended Media Grid cell, then choose Media in the inspector context controls to edit that cell's Caption and Alternative text; the separate top-level Media editor edits the primary image.

Cross-example workflow tests cover all three pairs and both lightweight starters: complete referenced assets, fresh identities, confirmed copy-only reset, repeated reset, original-library preservation and clean-context offline editable/playback reopening. These automated checks do not replace manual screen-reader, keyboard, supported browser/OS or delivery-video/OBS review. Follow [the milestone checklist](0.5.0-manual-test-plan.md). Feature PRs and this guide do not authorize release publication.


## Three starting points

The companion curates Studio, Portfolio and Newsletter from this existing original
collection. Use the [first-presentation guide](first-presentation.md) to create an
independent editable copy through the existing New presentation/example wizard.
Studio teaches the controls, Portfolio explains a project story, and Newsletter
organizes recurring updates. Their actual promoted-build previews belong to the
reviewed capture manifest; mock-ups are not product screenshots.
