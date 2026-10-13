# Verify an existing build

Produce a scoped assessment of the requested behavior using actual app observations. Verification does not assume code edits, commits or a rebuild. Choose relevant checks from the request, current source and app; move back to research whenever an observation needs explanation.

## Establish the conditions that matter

Use [builds](builds.md) to select current Nightly for ordinary merged-fix QA and identify the app actually tested and its relationship to the issue/PR. Exact/historical builds are for explicitly scoped work, not a default verification prerequisite. Select the explicit target and current Androperator capability readiness through [orientation](orientation.md). Setup success is not a behavior verdict.

Observe applicable flags, settings, theme, locale, navigation mode, profile/site/account state and device/API constraints. Compiled defaults, rollout proposals and current runtime state are distinct. Verify required flag state after relaunch; successive variants are different conditions, not simultaneous starting state. Preserve retained data for cases that depend on it; use disposable state for destructive checks within scope.

A source eligibility condition is not proof that a feature is active. Identify direct or inferred signals and state when uncertainty prevents assessment. On resume, read history for context and freshly observe mutable device/app state. An interrupted transition needs a new labeled attempt.

## Exercise and assess

For each useful check, identify the action, intended observation and evidence needed. Use current UI observations for navigation. Bound retries when timing or external state makes reproduction uncertain; record changed conditions rather than pick a favorable timing rule after seeing the outcomes.

Preserve the reported trigger and foreground state. Use [action recipes](recipes.md) for system-theme changes, rotation and settings navigation when applicable, with the issue's STR/TP taking precedence. Determine which event matters from source and reference media; re-entry-only coverage cannot establish foreground restoration.

Observe the result after the action. Do not manually rescue the transition being assessed and then attribute success to the app. Capture the transition and result using [evidence](evidence.md); a screenshot of a final state may not establish how it was reached.

Select nearby regression checks proportionate to the change, using applicable [QA resources](qa-resources.md) as leads. A non-reproducing baseline weakens causal comparison. An external site change or inaccessible setup can limit historical verification. State which trigger/condition was established rather than imply an internal race was exercised by ordinary taps.

Add [measured observations](evidence.md#measured-observations) when an exposed property supplies useful additional facts, such as geometry for a placement issue or exact preference values after recreation. Retain the measurements and conditions without inferring a fix verdict or causation from them. Do not require measurements or historical comparisons when they add no useful evidence.

## Inspect the whole affected UI group

When a change establishes or updates a repeated UI pattern, inspect the affected group for completeness, not only the components changed in the diff. Include items supplied by upstream code and items visible only on particular device or feature configurations. Compare relevant properties such as icons, alignment, labels, summaries, grouping, enabled state and interaction. Inspect actual screenshots as well as hierarchy data; decorative icons may not appear as separately identifiable accessibility nodes.

For an icon-related change, check comparable rows for expected icons and consistent alignment, including configuration-only rows. An omission may be intentional; record the observed difference and consult requirements, design references or established conventions before classifying it as a defect. If intent is unclear, flag the inconsistency for review rather than invent a universal rule that every item needs an icon. A source/runtime discrepancy likewise needs interpretation against intended behavior, not an automatic failure based only on source values.

Keep inspection claims tied to the actual inspected scope. Do not summarize a group as “icons verified” unless the relevant items were individually inspected; state exceptions and uninspected items. This does not require a per-row report, only a truthful summary of what was checked.

## Configuration coverage

For ordinary Android UI QA, attempt the requested behavior on phone portrait, phone landscape, after a foreground-preserving system theme change, tablet portrait and tablet landscape. Inspect appearance and usability: clipping/overlap, scrollability, reachable actions, restored content and relevant device-specific controls. Use [recipes](recipes.md) for the actual trigger and state restoration. This is a baseline, not a requirement to run every combination; add combinations when source or observations suggest an interaction. Honor an explicitly narrower task scope.

Use suitable authorized devices/emulators and the actual build selected for the task. A resized phone window alone does not establish tablet coverage. Resolve missing tablet access or setup within the authorized scope and continue independent phone checks. Report unavailable configurations as blocked/not run, or explain source/observed inapplicability. Default UI QA missing selected baseline coverage is partial; explicitly scoped checks can pass without implying the full baseline ran. Any observed defect remains a failure even when other configurations pass.

Include useful [configuration evidence](reporting.md#configuration-coverage-evidence) for every exercised configuration. Do not claim scrolling or restored interaction from a static screenshot alone. Flag additional configuration-specific defects separately from the original fix's result and prominently in actual results; creating a new issue is separately scoped publication.

## Local pre-submit QA

Developers may request a QA-only pass over local Android changes before submission. Inspect the branch/local diff to choose affected screens and relevant checks, build/install the actual changed APK when requested, and exercise the configuration baseline above. Use [build guidance](builds.md) to tie results to that source/diff, not installed Nightly. This supplements Core's tests/presubmit checks and does not imply code edits or publication.

For an unattended pass, resolve checkout/change scope, device/emulator targets, build/install authority, relevant reversible state changes, exclusive use and output location before execution. Routine emulator selection/start/creation follows [setup](setup.md#emulator-selection-and-setup), preferring existing devices; do not add approval pauses for operations already covered by the task. Resets or setup beyond the agreed scope require a real scope decision. If blocked, finish a useful partial/blocked report rather than wait indefinitely. Preserve original settings and report restoration limits.

## Complete the assessment

Return the checks, observations and limits using [reporting](reporting.md). A product failure or supported non-reproduction can complete an assessment; unavailable setup produces blocked/partial coverage. Preserve mixed outcomes. Posting and optional reproduction packaging are separately scoped work.
