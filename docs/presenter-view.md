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
