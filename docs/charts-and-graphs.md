# Charts & Graphs

Development feature for milestone [24](https://github.com/treisland/presentation-studio/milestone/24),
implementation [#271](https://github.com/treisland/presentation-studio/issues/271).
The maintainer accepted the milestone and authorized 0.19.0-beta.1 promotion on
2026-11-15. See [release authority](releases/0.19.0-beta.1-validation.md); publication
still requires protected integration and final artifact gates.

## Add and edit a chart

1. Open **Insert / Library → Charts & Graphs**. Choose **Customize** under a
   column, horizontal bar, line or donut preview. Search filters this category.
2. In **Chart studio**, name the chart and edit category names, series names and
   values in **Data**. Choose **+ Series** at the end of the header or **+ Category**
   below the rows. New entries focus their name field. Remove any category with
   its row's × button, or any series with × beside its header. Hover/focus labels
   identify each target; the remaining values and custom colors stay together.
   The last category and last series cannot be removed. You can remove a row
   containing invalid data without first repairing that row.
   The preview updates as you type; edits stay staged until you apply them.
3. To paste spreadsheet values, expand **Paste spreadsheet data**. Copy the header
   row and data rows, paste them in the field and choose **Use pasted data**.
4. Choose **Style**. Leave **Use presentation theme** enabled for linked colors,
   or turn it off to customize each named series with its swatch/color picker
   and individual six-digit hex field. Donuts show a color for each category.
   Renaming or removing an item keeps its remaining colors aligned. Turning
   theme colors on and off preserves your staged custom choices until Apply.
5. Choose **Insert chart**. Select the chart on the canvas or in Layers, then use
   Inspector **Content → Edit chart data & style** to reopen the same editor.
   A single click or focus selects the chart. Double-click it, or press Enter on
   the focused chart, to open Chart studio. **Apply chart** makes one
   undoable change; **Cancel** or Escape discards staged changes.

Charts are ordinary movable/resizable free objects. Use the existing Arrange,
duplicate, group, visibility and lock controls. Unlock the presentation, slide
and selected object before editing. If the project changes while Chart studio
is open, cancel and reopen it before applying.

## Data and limits

Use 1–12 categories and 1–4 named series. Each series needs exactly one finite
number per category, between −1 trillion and 1 trillion. Labels and titles are
nonempty single-line text of at most 80 characters; category and series names
must each be distinct. Zero and negative values work in column, bar and line
charts. An all-zero chart uses a 0–1 scale. Donuts need one series with
nonnegative values and a positive total. Remove extra series before switching
to a donut, or paste a single-series dataset after choosing that type.

Paste up to 16,000 characters of tab-separated data (recommended) or simple
comma-separated data. The first column contains categories; the remaining
header cells name series. Every row needs the same number of cells. Use plain
numbers, optionally with decimal points, minus signs or scientific notation.
Quoted CSV cells, thousands separators, currency symbols, percentages and blank
numeric cells are unsupported. Invalid paste keeps the current grid; invalid
grid input disables Apply until corrected. The preview retains its last valid
render while an error is visible.

Example (tabs between columns):

```text
Category	Product	Services
Q1	120	80
Q2	140	100
Q3	180	130
Q4	210	160
```

Long axis labels are abbreviated in the graphic. **View chart data** exposes
the complete labels and exact values in a semantic table in previews and
playback. Line series also use distinct dash patterns. Review chart size and
contrast in the actual presentation; small chart objects can be hard to read.

## Saving, reuse and portability

AI authoring supports a native `chart` block in portable v1 and v2. Download a
fresh AI instruction pack from AI presentations and attach its instructions,
matching schema, capability catalog and `charts.json` example to your assistant.
The four chart kinds use the same data limits and editable native operations as
the Library. Choose `layout: chart` or `auto`, preferably one chart per slide.
Import previews and schema/semantic errors appear before acceptance. The catalog
also explains which other Library items require manual Studio steps; personal
components and actual media are not automatically available to an assistant.

Save a selected chart using the existing **Save selection as component** flow.
Inserted copies receive independent object IDs and data. Export/import the
component library to transfer it to another browser profile. Theme-linked charts
use the destination presentation colors; custom colors remain fixed.

Editable project ZIPs and browser recovery retain chart data and editing.
Playback and booth ZIPs render charts and their data tables offline. There are
no external assets, chart dependencies, accounts or data connections.

Standalone exported HTML bundles its app runtime. To use an updated chart-editor
fix with an existing export, import its editable ZIP into the updated application
and export it again. Reopening the old `index.html` alone still runs its older code.

The native project and component-library format generations stay unchanged.
Chart configuration is an additive, bounded, validated `data-studio-chart`
attribute on a free block. Imports regenerate canonical fallback content and
native SVG from validated data; arbitrary SVG or scripts are not imported.
Existing projects without charts are unchanged. Older builds that do not support
charts may retain the fallback title/data table but cannot promise editable chart
round trips; keep an original backup and reopen with this feature's build.

Area, scatter, waterfall and KPI charts, live spreadsheet links and external
data services remain outside this milestone. The planning POC guides the chart
cards and preview/data/style flow, not the app's overall navigation or release
version.

## Manual review

- Insert each chart type and use keyboard navigation through title, grid, paste
  and Style controls. Check desktop/laptop layouts, 390px width, zoom and light/
  dark editor and presentation themes. Review screen-reader names and data tables.
- Paste valid, negative, zero, empty, malformed and maximum-size data. Change the
  chart type, native color pickers, individual hex fields and theme; test Cancel,
  Undo/Redo and switching objects. Add categories/series, remove a middle or first
  item and verify data/color associations, new-name focus and minimum/maximum limits.
- Move, resize, duplicate, group, hide and lock charts. Save/recover the browser
  project. Export/import a library in a clean profile and verify independent copies.
- Export and reopen editable, playback and booth ZIPs offline. Verify chart
  graphics, exact data, theme colors, original IDs and unrelated legacy content.

Automated tests cover authoring, validation, locks, Undo, stale apply, responsive
overflow, component transfer and real offline exports. These do not replace
maintainer screen-reader, visual or first-user acceptance.

## Companion content and screenshot review

Canonical affected guide: [Blocks and components](blocks-components.md), linking
to this development guide. No public deployment or public image replacement is
part of this feature. Per [website process](website-process.md), the **editor
overview** scene is affected by the new Library category/Inspector entry;
authentic development captures are local review candidates only and public
refresh is pending maintainer acceptance with a recorded version/SHA/digest.
The AI import preview scene is also affected by chart layout/preview support;
public refresh and maintainer review are pending. Existing examples gallery,
Media Focus and finished playback fixtures do not contain charts; no replacement
is proposed for those fixtures. Release-wide imagery review remains pending. The POC
image is an illustration, not a public screenshot or evidence of shipped UI.
