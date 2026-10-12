# Verify an existing build

Produce a scoped assessment of the requested behavior using actual app observations. Verification does not assume code edits, commits or a rebuild. Choose relevant checks from the request, current source and app; move back to research whenever an observation needs explanation.

## Establish the conditions that matter

Use [builds](builds.md) to select current Nightly for ordinary merged-fix QA and identify the app actually tested and its relationship to the issue/PR. Exact/historical builds are for explicitly scoped work, not a default verification prerequisite. Select the explicit target and current Androperator capability readiness through [orientation](orientation.md). Setup success is not a behavior verdict.

Observe applicable flags, settings, theme, locale, navigation mode, profile/site/account state and device/API constraints. Compiled defaults, rollout proposals and current runtime state are distinct. Verify required flag state after relaunch; successive variants are different conditions, not simultaneous starting state. Preserve retained data for cases that depend on it; use disposable state for destructive checks within scope.

A source eligibility condition is not proof that a feature is active. Identify direct or inferred signals and state when uncertainty prevents assessment. On resume, read history for context and freshly observe mutable device/app state. An interrupted transition needs a new labeled attempt.

## Exercise and assess

For each useful check, identify the action, intended observation and evidence needed. Use current UI observations for navigation. Bound retries when timing or external state makes reproduction uncertain; record changed conditions rather than pick a favorable timing rule after seeing the outcomes.

Preserve the reported trigger and foreground state. For theme/lifecycle checks, changing Android's system theme while the affected settings page stays open is different from changing Brave's Appearance setting and returning to that page. Determine which event matters from source, STR/TP and reference media; document an authorized ADB/API trigger when it is needed to avoid navigation that invalidates the check. Re-entry-only coverage cannot establish foreground restoration.

Observe the result after the action. Do not manually rescue the transition being assessed and then attribute success to the app. Capture the transition and result using [evidence](evidence.md); a screenshot of a final state may not establish how it was reached.

Select nearby regression checks proportionate to the change, using applicable [QA resources](qa-resources.md) as leads. A non-reproducing baseline weakens causal comparison. An external site change or inaccessible setup can limit historical verification. State which trigger/condition was established rather than imply an internal race was exercised by ordinary taps.

## Complete the assessment

Return the checks, observations and limits using [reporting](reporting.md). A product failure or supported non-reproduction can complete an assessment; unavailable setup produces blocked/partial coverage. Preserve mixed outcomes. Posting and optional reproduction packaging are separately scoped work.
