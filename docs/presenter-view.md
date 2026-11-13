# Presenter View

Open More → Presenter tools → Presenter View. Allow the audience popup and move it
to your display manually. Press F in that window for browser fullscreen. A connected
status appears only after the audience completes its per-window handshake.

LIVE identifies the last acknowledged audience slide. Browse slides privately in
the separate silent preview and read its speaker notes. Browsing, Return preview
to live and closing this panel do not change the audience. Present this slide or a deliberate double-click on a slide commits the selected preview. Previous/Next live advance from
LIVE, independently of private browsing. Play/Pause controls audience playback. The
initial session and an explicitly reopened audience start paused.

The session is an immutable snapshot. Source edits do not update its content, notes
or original media bytes. End presentation and launch again to include changes.
Closing the panel keeps the session open. End presentation closes the audience and
releases the session. Reopen audience explicitly recovers the original snapshot at
the last acknowledged live slide; it retains the private selection. Switching to
another project ends the session. Popup failure, timeout and disconnection provide
an explicit reopen action; the app never repeatedly opens windows automatically.

## Privacy and transport contract

Audience documents use the same sanitized playback pack and document builder as
portable exports. Only visible public content and referenced asset blobs are sent.
Private notes, authoring/history, search state and private selections stay in the
presenter closure. The audience opener reference is cleared before content starts;
silent previews use opaque sandboxed frames. Public playback remains inspectable;
this is not copy protection or a security boundary against a person controlling the
presenter's browser profile. Share the audience window, not the presenter panel.

Each output binds an exact window identity, origin (including normalized file
origins), random per-window nonce and project identity. A one-time validated
handshake transfers a dedicated MessagePort and at most 1000 referenced assets,
with a 200 MB session media budget. Output initialization waits for those original
immutable blobs. Subsequent messages allow only bounded explicit present/ping/end, audience play/step/blackout and private thumbnail
commands with monotonic sequence numbers and known public slide IDs. Invalid,
stale, wrong-project/session or detached-window messages are ignored. Unused assets
and private history do not travel to outputs. No external service is used.

Browser autoplay/fullscreen policies may require gestures. Actual dual-display,
supported-browser popup, screen-sharing and large-media performance checks remain
manual release evidence; automated two-window tests do not imply those passed.
The parent is paused independently of audience rendering. Existing project formats,
IDs, locks, Undo, browser recovery and offline exports retain their contracts.

## Private List/Grid and Find the answer

List and Grid use numbered snapshot slide titles with explicit LIVE and PRIVATE
PREVIEW markers. Browse with native keyboard focus/Enter or select a result; the
audience does not move until Present this slide. Search locally across titles,
public slide text/commands and private speaker notes. Excerpts identify their source
and highlight literal matching words. Nothing is generated and no external AI or
service receives queries. Clear search retains the selected List/Grid view. Search
and pagination reset result scroll intentionally; periodic live acknowledgements do
not rebuild cards or move scroll/focus. Hidden slides/notes are omitted. Source
edits, deletions or reorderings do not retarget the immutable session's stable IDs.

Results mount at most 12 cards per page and eight inert static thumbnail documents
at once. A single separate silent playback renderer supplies public-only snapshots;
queries and notes never go to that renderer or the audience. Thumbnail documents
have no scripts, autoplay, active navigation or network permissions. Embedded images
are ephemeral thumbnail derivatives (up to 640×360) or small original SVGs; original
project bytes are retained unchanged. Decode failures and exceptionally large slide
markup have a useful full-preview fallback. The cache holds at most 24 documents
and 16 million HTML characters, and each document is bounded to two million. Assets
and HTML are discarded when the session ends. These are runtime work/memory bounds,
not a guarantee of frame rate on every device; large-media/laptop review is manual.

## Live controls and Q&A detours

Private preview follows live initially. Browsing away turns Follow live off; only
the explicit checkbox turns it back on. Live navigation uses the audience’s active
loop and position, even while a different slide is selected privately. Native
buttons, search and select inputs retain their keyboard behavior.

Begin Q&A detour saves LIVE once. Repeated presents do not replace that resume point.
Resume presentation explicitly presents the saved snapshot slide and clears the
anchor after acknowledgement. Return preview to live never resumes or changes the
audience. An unavailable saved target disables Resume with recovery instructions.

Blackout pauses playback and media while retaining the current live slide and timer
position. Restore audience restores the prior play/pause state. Reopening retains
blackout and the saved resume point, but starts paused. End presentation is separate
and disposes all outputs, ports, caches and session timers. Session elapsed time is
independent of the optional per-slide time line and private search.

Audience slide footer selects Modern, Classic or Hidden without navigating or
starting playback. It starts from the current viewer preferences and persists for
explicit audience reconnects. Classic shows passive on-slide title/count, time line
and segmented progress; its segments cannot navigate or receive keyboard focus in
the audience. The private LIVE preview follows footer-style changes.


## Preview navigation and double-click presentation

Use **Previous slide** and **Next slide** beside PRIVATE PREVIEW to browse the
visible snapshot in presentation order. These buttons change only the private
preview and its notes; they stop at the first/last slide. **Previous audience
slide** and **Next audience slide** remain separate live actions and use the
audience's current loop, even while you browse privately.

Single-click a List/Grid card to preview privately. Double-click a card, or the
large private preview, to present it to the audience. This is an explicit live
change, equivalent to **Present this slide**. Keyboard users can select a card
with Enter and use Present this slide; double-click is never required. Search
and changing List/Grid remain private. A disconnected audience still requires
an explicit reopen before a slide can be presented.

Affected companion scenes for future development/beta capture: editor-overview
(slide Background section). The current companion's stable-v0.11.0 images remain
accurate for that immutable artifact. Presenter navigation screenshots are local
review candidates, not published stable claims.


## Full-window presenter workspace

Presenter View fills the app window by default; browser fullscreen is a separate,
explicit **Fullscreen** action. **Back to editor** exits owned fullscreen and
closes the panel while retaining the audience session. **End presentation** is
separate and closes outputs and releases ports, previews and timers.

The three desktop columns are Slides, LIVE/private preview, and Speaker notes.
The slide browser and notes scroll independently; essential audience controls stay
visible. Narrow windows adapt without horizontal page overflow. Secondary controls
remain in **More**: Follow live, return-preview-to-live, Q&A detour/resume, audience
reopen, footer style, holding settings, snapshot information and help.

Normal List/Grid cards show only thumbnails, numbered titles and LIVE/PRIVATE
PREVIEW markers. Search still indexes titles, slide text and private notes. An
active query can show a short highlighted matching excerpt; clearing it restores
compact cards. These excerpts are private and never travel to audience output.

The notes pane has **Live / Preview** source buttons, an explicit slide/title label,
independent scrolling, and **A− / A+** controls (18–32px; 22px initially). Preview is
the initial source. Reading position survives status/clock updates; changing the
notes source resets its scroll. Notes, text size and workspace state are session
UI only, not project content or portable viewer defaults. New sessions reset them.

## Blackout and optional holding screen

**Blackout audience** hides the complete slide, including descendants with their
own visibility rules. The audience viewport is entirely black; this is separate
from changing a slide's background. It pauses media and automatic advancement.
The private retained-live monitor and prominent output-state banner stay visible.

**Show holding screen** instead displays either the built-in “We’ll be right back”
design or a chosen visible slide from the immutable session. Configure it in
**More > Holding screen settings**. Choosing/previewing settings does not change
the audience; Show is explicit. Cancel or Escape closes the staged settings without
presenting them. A missing/hidden saved slide falls back visibly to the built-in
design for that session; no authored content is silently rewritten.

Both modes retain the live slide, timer position and Q&A resume point. Private
browsing remains available. Present, audience navigation/play and Q&A Resume are
disabled until **Restore audience**. Restore returns the retained live content and
its prior play/pause state. Switching between Blackout and Holding retains that
state. Explicit audience reopen preserves the output mode but starts paused.

Holding output is a static, silent public snapshot: videos become saved posters
or placeholders, images are flattened display derivatives, and scripts, audio,
iframes, animation and interaction are unavailable. A sandbox and restrictive CSP
prevent scripts or remote fetching. Original media bytes are not replaced. Custom
snapshot generation is bounded (up to 1920×1080 image derivatives, 6M image-string
budget, 8M document characters, two cached documents and a 10-second timeout).
Failures are actionable and retries require an explicit user action. The separate
private-browser thumbnail budgets remain unchanged.

**This session only** is the default. **Save as deck default** is deliberate and
requires an editable, unlocked presentation and unlocked slides. It saves only the
bounded holding-screen choice, through the existing Undo/recovery/ZIP contract;
rendered HTML and notes never enter project state. It does not start a new content
format or publish a release. Ordinary playback/booth exports remain separate;
this feature does not add unrestricted holding controls to permission-limited booth
players. Omitted holding-slide references are removed from public export settings.

After this redesign, repeat real-device notes reading, touch/keyboard and screen-
reader review, fullscreen/popup behavior and holding/blackout restore with actual
video and window capture. The later maintainer acceptance and reported Windows 11
browser versions are recorded in [the v0.16 beta validation record](releases/0.16.0-beta.1-validation.md).
OBS-specific sign-off is no longer a release gate by maintainer decision.

Known limitation: if a saved holding slide was deleted or hidden, Cancel/Escape
in Holding screen settings can restore an unavailable choice. Explicitly select
Built-in design before Show holding screen. This is accepted for a patch under
[#241](https://github.com/treisland/presentation-studio/issues/241); see
[known issues](known-issues.md).
