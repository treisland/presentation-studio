# Import compatibility policy

Compatibility is defined by format generation, not the number of application releases since creation. Multiple app releases may write the same format.

| Input | Accepted format | Contract |
| --- | --- | --- |
| Native editable project JSON/ZIP | schema v2 and v3 | Preserve IDs, media, history, recovery and offline behavior; effect settings require v3 |
| Existing legacy import | schema v1 | Retain current legacy importer and validation; not a promise to accept arbitrary JSON |
| Portable AI authoring JSON | presentation-studio-authoring v1 | Validated input creates a native project; does not replace lossless editable ZIP storage |
| Component library JSON | presentation-studio-components v1 | Independent presets with bundled media, browser-local import/export |

No format support is removed by 0.10.0. When introducing a new format generation, support and regression-test the current and previous generation, retaining older support while safe and maintainable. Deprecation requires advance documentation naming the last compatible Studio release and an editable-ZIP migration route. A one-line app-version cutoff is not sufficient.

The maintainer approved guarded native v3 for v0.12.0 background effects. Existing v1/v2 imports remain supported, and untouched projects continue exporting v2. Effect settings in the current project, recoverable history/checkpoints or starting state require v3. Older editors reject v3 instead of silently dropping settings; preserve the original file and use Studio v0.12.0+ rather than changing the version number. Portable authoring and component-library versions remain v1. See [background effects](background-effects.md).

Validate before replacing active work. Reject unknown future formats and unsupported fields safely; do not silently discard content or ask an LLM to downgrade native schemas. Migration/opening must not overwrite the original file. Export upgraded copies explicitly and explain any limitations when opening them in older editors. All supported legacy inputs still pass current security, size and path validation.

About lists the loaded application's accepted inputs, separately from its app version. Browser recovery, editable projects, component libraries and portable authoring are distinct contracts. See [deployment and recovery](deployment.md).
