# Develop through source and app

Complete the requested feature, prototype or fix with a focused change and inspect what it does in the running app when runtime validation is in scope. Continue the inspect → edit → build/install → observe → revise loop as evidence requires; return to [understanding](understand.md) whenever assumptions change.

## Feature intent and developer collaboration

Start from the supplied description, design, source or app context; no issue/PR is required. Establish intended user-visible behavior and relevant constraints. Inspect source and existing patterns to resolve routine implementation choices. Ask about consequential product ambiguity that the available evidence cannot settle, while continuing independent investigation.

Default to completing authorized work, including requested build/install/runtime inspection. Do not stop at a proposed approach or request approval for each edit or iteration. If the developer asks to discuss the approach before editing, honor that checkpoint; resume implementation when it is authorized. Local-only requests use the same development loop and evidence standards as autonomous tasks, with [local delivery](reporting.md#local-development-summary).

Incorporate developer feedback, supplied screenshots and manual checks as context, identifying developer-reported observations separately from agent-inspected evidence. The developer may navigate the app or edit code between iterations. Take turns controlling the device; reacquire current UI after handoff and inspect changed source before acting. Resolve conflicting writes instead of overwriting them. Collaboration does not require a separate mode or a human confirmation at every step.

## Choose a reviewable change

Select the checkout using [setup](setup.md#configuration), read its instructions and inspect local work before editing. A reference checkout used only for historical reads is not implicitly writable. A Core Git worktree alone is not necessarily a buildable Chromium workspace; use a suitable configured workspace and the host/Core branch rules.

“This checkout” explicitly selects the Core checkout containing the session's working directory and overrides the configured default. “Current branch” means that selected Core checkout's branch, not BART's branch. Record its starting revision/status, preserve existing commits and local work, and add only task changes; do not switch branches or redirect builds to another checkout as a convenience. If cwd is not in Core, resolve the intended checkout before product writes.

Use relevant Core docs/best practices and ownership patterns. Prefer an existing Brave-owned seam over unnecessary Chromium patches or a broad refactor. For Android UI work, trace the current resource/theme/context and callbacks before choosing the change. Follow Core's current source-registration rules when adding files.

Keep the change focused on one meaningful behavior, with tests appropriate to its risk, whether it stays local or becomes a PR. Separate mechanical cleanup only when it improves review. If runtime/source evidence shows no change is warranted, explain that finding rather than invent a fix.

## Iterate and validate

- Run relevant source checks and tests; select assertions that catch the change's behavior and useful regressions. A tiny styling edit does not need a test that merely repeats the implementation.
- Build/install with [build guidance](builds.md), then observe the selected app through Androperator. A passing test or build alone does not establish rendered behavior.
- If configured to use Scaffold, load its selected installation's [build skill](builds.md#build-with-brave-scaffold) for the actual build/test work. Pass the selected Core checkout explicitly and preserve its normal preparation guards; continue using BART/Androperator for app investigation and assessment.
- Inspect the changed scope and nearby affected interactions. For visual changes, consider theme, focus, layout and relevant device conditions; choose proportionate coverage rather than require a broad matrix.
- Capture using [evidence](evidence.md) while the behavior happens. For causal before/after claims, compare supported builds and matched conditions. Preserve unexpected results and revise the hypothesis/change.
- Keep build-tool preparations or local Android support overlays out of product commits. Do not reset or reverse unrelated staging/work to tidy the diff.

Builds, installs, syncs and repairs follow the current task's checkout/device authority. Honor an existing agreement without repeating approvals. Resolve unavailable setup or conflicting local edits without discarding work.

## Deliver

### Requested QA evidence pack

A request to implement locally and create a QA evidence pack includes building the changed app, installing/launching it on suitable task-selected devices/emulators, and inspecting the result through Androperator within host rules. Do not stop after compiling or substitute installed Nightly for the changed build. Use the [configuration baseline](verify.md#configuration-coverage) for UI assessment, including the device-specific surface implicated by the issue.

Save the pack in a dedicated directory under the selected work root, named for the issue/feature with an attempt label when needed. It contains the [local HTML report](reporting.md#local-html-verification-report), readable captures/decisive clips, useful build/test/install receipts, session Androperator usage notes and a [text-only context ZIP](report-context.md). Keep private originals separate from sanitized report-linked/exported content. No publication or live replay is implied by pack creation.

Identify the requirement, focused implementation, actual Core commit/local diff and the source/build/device behind each observation. Capture the relevant before state while available when comparison helps, then the changed build under comparable conditions; do not manufacture a missing baseline or alter protected local state to obtain one. Describe observed results and coverage limits separately from implementation/commit status. “Show the task complete” means document actual completion evidence, not produce a predetermined pass. A failed build, no warranted change or partial validation still receives a truthful pack with available receipts and next actions.

Follow the selected Core checkout's commit instructions and requested commit scope. Commit product changes/tests in Core; task reports/media remain in the working directory. Record final commit and build relationship in the pack without claiming that a commit itself proves app correctness. Local-only requests must not push or create GitHub reports/PRs regardless of publication defaults.

An optional [local pre-submit QA pass](verify.md#local-pre-submit-qa) can inspect the changed build across phone/tablet, landscape and theme configurations before submission. The same entry point handles this QA-only request; it does not automatically edit code or publish findings. Resolve targets and authorized operations before an unattended run, then return the report and observed defects for the developer's next iteration.

Follow the request and Core/host commit rules; any commit contains only the intended source change and relevant tests. [Reporting](reporting.md) defines the lightweight local summary and requested reports/PRs. Local-only work does not imply a QA document, posting, push or reproduction package. A prototype can reveal remaining defects; report them. A truthful failed prototype does not prove a fix, but can demonstrate useful development work.
