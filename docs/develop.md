# Develop through source and app

Complete the requested prototype or fix with a focused change and inspect what it does in the running app. Continue the inspect → edit → build/install → observe → revise loop as evidence requires; return to [understanding](understand.md) whenever assumptions change.

## Choose a reviewable change

Select the checkout using [setup](setup.md#configuration), read its instructions and inspect local work before editing. A reference checkout used only for historical reads is not implicitly writable. A Core Git worktree alone is not necessarily a buildable Chromium workspace; use a suitable configured workspace and the host/Core branch rules.

Use relevant Core docs/best practices and ownership patterns. Prefer an existing Brave-owned seam over unnecessary Chromium patches or a broad refactor. For Android UI work, trace the current resource/theme/context and callbacks before choosing the change. Follow Core's current source-registration rules when adding files.

Keep the PR boundary focused on one meaningful behavior, with tests appropriate to its risk. Separate mechanical cleanup only when it improves review. If runtime/source evidence shows no change is warranted, explain that finding rather than invent a fix.

## Iterate and validate

- Run relevant source checks and tests; select assertions that catch the change's behavior and useful regressions. A tiny styling edit does not need a test that merely repeats the implementation.
- Build/install with [build guidance](builds.md), then observe the selected app through Androperator. A passing test or build alone does not establish rendered behavior.
- Inspect the changed scope and nearby affected interactions. For visual changes, consider theme, focus, layout and relevant device conditions; choose proportionate coverage rather than require a broad matrix.
- Capture using [evidence](evidence.md) while the behavior happens. For causal before/after claims, compare supported builds and matched conditions. Preserve unexpected results and revise the hypothesis/change.
- Keep build-tool preparations or local Android support overlays out of product commits. Do not reset or reverse unrelated staging/work to tidy the diff.

Builds, installs, syncs and repairs follow the current task's checkout/device authority. Honor an existing agreement without repeating approvals. Resolve unavailable setup or conflicting local edits without discarding work.

## Deliver

Follow Core/host commit rules and commit only the intended source change and relevant tests. [Reporting](reporting.md) owns draft-PR descriptions, validation details, media and publication scope. A prototype can reveal remaining defects; report them. A truthful failed prototype does not prove a fix, but can demonstrate useful development work.
