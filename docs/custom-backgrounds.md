# Custom backgrounds

In Project settings → Background, choose Presentation or This slide, then a custom
Theme, Solid, Gradient or Image background. Theme follows the existing deck theme;
solid/gradient colors accept six-digit hex values or bounded theme roles such as
background, ink, accent, secondary and muted. Explicit colors stay explicit when the
theme changes. Existing projects keep their appearance until an explicit edit.

Presentation defaults affect inherited slides. A slide override replaces the entire
background configuration. Start from presentation background copies the resolved
default before customization. Reset removes the override and restores inheritance;
resetting the presentation restores the original theme while preserving slide overrides.
New slides inherit. Duplicated overrides are independent. Changes respect locks and
apply through one Undo transaction. Cancel is read-only; a changed project/revision
requires refreshing the staged preview before Apply.

Images come from referenced project assets or a local upload: PNG, JPEG, WebP or SVG,
at most 50 MB and 16000 pixels per side. Original bytes are retained. Fill crops at
the horizontal/vertical focal point; Fit shows the entire image over the fallback
color. Transparent pixels also reveal that fallback. No remote image URL is accepted.
Use appropriately licensed images and test large images with actual delivery media.

Background media stays in its existing position above the custom base and can cover
it. This feature never silently moves/deletes that media. Decorative effects remain
separate, with their existing motion and Decorations controls. Decorations visibility
does not remove a solid/gradient/image base required for text readability. Image overlay color/opacity and Protect text area are explicit, staged controls.
Protect left/right adds a full-strength overlay-color fade from that side; opacity
controls the separate full-image overlay. Text and content are never recolored.

Coordinated looks offer a theme-linked blend and an original static Quiet horizon
illustration. Choose Title, text-left, text-right or Divider explicitly; the choice
maps to the current scope only and never guesses from slide content. Preview the
chosen look, then Apply or Cancel. Theme roles adapt to the deck palette; literal
hex colors remain literal. Bulk representative previews are a separate issue.

Review dense text, code, tables and photographs at playback size in light and dark
themes. Quiet areas and overlays help composition but cannot guarantee contrast,
readability or accessibility, especially over textured images.

## Files, recovery and offline delivery

The maintainer-approved native v4 guard is used only when custom-background data
exists in active or recoverable state, including Undo/Redo/checkpoints/starting state.
Existing native v1/v2/v3 imports remain supported; untouched projects keep their
format. Older editors reject v4 instead of silently discarding backgrounds. Do not
manually downgrade the schema number. Self-contained exported viewers include the
new renderer. An editable ZIP is the portable backup; JSON alone lacks image bytes.

Editable exports and browser recovery retain original image assets still needed by
history even after an active background is reset. Playback and booth files include
visible-content backgrounds and their assets without private notes/history. Reopen
complete exported ZIPs offline; preserve original backups when upgrading.

Portable authoring v1 is unchanged. Use the separate **presentation-v2.schema.json**
and version 2 only for new `backdrop` fields, demonstrated by
`custom-backgrounds-v2.json`. `background` remains the existing decorative-effect
configuration. v2 accepts presentation defaults and complete per-slide backdrops.
Image references require a complete ZIP containing local assets. Invalid/future
formats, unsafe paths, missing images and invalid image bytes are rejected before
active work is replaced. Component-library format remains v1.

Automated checks are distinct from manual supported-browser, screen-reader, large
image/video performance and delivery review. This feature does not publish a beta.
