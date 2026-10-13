---
name: brave-core-bart
description: Develop Brave Android features, investigate bugs or verify changes using source and the running app.
metadata:
  opencode/slash: "true"
---

# Brave Android work

Complete the user's requested feature, explanation, investigation, prototype, fix or verification using the current agent's tools. Assess actual observations and deliver the requested result, including unresolved blockers or coverage limits. Stay within review-only, discussion-before-editing or draft-only scope when requested.

Accept a plain feature description, design reference, source context or app observation without requiring an issue/PR. Continue authorized implementation and validation autonomously unless the user requests a checkpoint or a consequential choice/blocker needs input. Use the same guidance for local developer collaboration; [develop](../../../docs/develop.md) explains how to incorporate feedback without adding routine approval gates.

Resolve links from this skill's real source directory, following discovery symlinks. BART's root is three directories above it. Use [setup and configuration](../../../docs/setup.md#configuration) to select the checkout, working root and any publication defaults. Missing config is supported. Read the selected Core checkout's own instructions before product work. If development posting would substitute a preview for a requested PR, state that mismatch early and follow [delivery scope](../../../docs/reporting.md#delivery-scope).

## Choose the next useful action

Move freely between understanding, acting and reporting. They are capabilities, not ordered phases. Start with source or app; return to issue research when a runtime surprise changes your hypothesis; revisit setup after a change; inspect an evidence gap while reporting. No phase-completion gate or mandatory research package is required. Reuse sufficient conversation and saved context.

Load only the guidance needed for the next decision:

| Need | Guidance |
| --- | --- |
| Locate source, tools or Android capabilities | [Orientation](../../../docs/orientation.md) |
| Understand an issue, PR, expectation or mechanism | [Understand](../../../docs/understand.md) |
| Change code and inspect the result | [Develop](../../../docs/develop.md) |
| Assess an existing build | [Verify](../../../docs/verify.md) |
| Select an APK, build or install | [Builds](../../../docs/builds.md) |
| Capture and interpret observations | [Evidence](../../../docs/evidence.md) |
| Change system theme, rotate or navigate Brave settings | [Action recipes](../../../docs/recipes.md) |

For Android actions, use installed `androperator-agent-orientation` when unfamiliar and `androperator-agent-control-loop` for adaptive execution. Their maintained [host guidance](https://docs.androperator.com/host-agents/) is the fallback. The current agent chooses actions and judges results; no child agent or saved runtime skill is needed.

Ordinary QA of a merged fix uses current Nightly, including a newer installed build than the PR's release comment. Follow [build selection](../../../docs/builds.md#select-and-identify-an-apk); exact/historical testing is a distinct requested scope.

For UI QA, follow the [configuration baseline](../../../docs/verify.md#configuration-coverage) and include its captures/coverage gaps in the report. A [local pre-submit QA request](../../../docs/verify.md#local-pre-submit-qa) uses the developer's changed build rather than Nightly and can run autonomously within agreed device/build scope.

Use [emulator setup](../../../docs/setup.md#emulator-selection-and-setup) for missing local device coverage: prefer a suitable running or existing stopped emulator, then create one when needed within the task/host scope. Routine emulator setup does not require a separate user prompt.

During Androperator work, maintain per-session [usage notes](../../../docs/evidence.md#androperator-usage-notes) for API/docs gaps, feature requests and concrete fallbacks such as `adb`, referencing existing logs rather than duplicating them.

## Finish the requested work

For local development, return the concise [development summary](../../../docs/reporting.md#local-development-summary). Use `brave-core-bart-report` when an assessment, saved report, prototype demonstration or draft PR is useful/requested. Read its [instructions](../brave-core-bart-report/SKILL.md) directly if native loading is unavailable. An ordinary verification ends with an assessment, not automatic posting or code changes.

Use `brave-core-bart-reproduce` when saving adaptive instructions is requested or useful. Its [instructions](../brave-core-bart-reproduce/SKILL.md) distinguish package creation, reuse testing and sharing. Do not add those tasks to every investigation.

Continue authorized iteration until the requested scope is assessed or a concrete blocker prevents it. If no code change is warranted, report the supported finding rather than manufacture a fix. State what was observed, what remains unknown and where useful retained evidence lives.
