# Known issues

## Holding-screen fallback after cancelling settings

Tracking: [#241](https://github.com/treisland/presentation-studio/issues/241).
The maintainer accepted this limitation for v0.16.0 beta and official release on
2026-11-13 (America/Denver), with a fix deferred to a patch.

If a saved custom holding slide is deleted or hidden, a new Presenter session
initially selects the built-in fallback. Cancelling Holding screen settings or
pressing Escape can restore the unavailable slide ID into the controls. A later
Show holding screen attempt then fails validation.

**Workaround:** open Holding screen settings and explicitly choose **Built-in
design**, then use **Show holding screen**. True **Blackout audience** remains
available. The failed action does not change the authored project or retained
live slide. This issue is acknowledged, not fixed in this release.

The patch must normalize unavailable slide choices on Cancel and Escape without
silently rewriting authored defaults, with regression coverage for both hidden
and deleted slides.
