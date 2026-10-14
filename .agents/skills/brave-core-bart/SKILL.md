---
name: brave-core-bart
description: Develop Brave Android features, investigate bugs, verify behavior or review PRs using source and the running app.
metadata:
  opencode/slash: "true"
---

# Brave Android work

Complete the user's requested feature, investigation, explanation, verification or technical review using the current agent's tools. Accept ordinary descriptions, issue/PR links, design references and app observations without a mode syntax or preparation package. Deliver the requested result with actual observations and honest coverage limits.

Resolve links from this skill's real source directory through discovery symlinks. Use [setup and configuration](../../../docs/setup.md) for checkout, target and working-directory selection and read the selected Core checkout's instructions before product work. Missing config is supported. “This checkout/current branch” selects the session's Core checkout/branch, not BART's branch. Continue authorized work without routine approval pauses; honor discussion-before-editing, code-only, review-only and local-only scope. Resolve consequential target, local-work or authority conflicts.

## Choose the next useful action

Move freely between understanding, acting and reporting. A runtime surprise can send you back to source; a code change can require setup research; a report can expose an evidence gap. Reuse sufficient conversation and retained context. Load only the guidance needed for the next decision:

| Need | Guidance |
| --- | --- |
| Locate source, tools or Android capabilities | [Orientation](../../../docs/orientation.md) |
| Understand requirements, source or discussion | [Understand](../../../docs/understand.md) |
| Implement and inspect a feature/fix | [Develop](../../../docs/develop.md) |
| Assess app behavior and configuration coverage | [Verify](../../../docs/verify.md) |
| Review code and perform requested PR-build experiments | [Technical review](../../../docs/review.md) |
| Select an APK, sync a review workspace, build or install | [Builds](../../../docs/builds.md) |
| Capture and interpret observations | [Evidence](../../../docs/evidence.md) |
| Change system theme, rotate or navigate settings | [Recipes](../../../docs/recipes.md) |

For Android execution, use installed Androperator orientation/control-loop instructions or its [maintained host guidance](https://docs.androperator.com/host-agents/). If tooling is missing, follow [installation guidance](../../../docs/setup.md#missing-androperator-installation) and resume after verified setup rather than silently substitute all-ADB execution. The current agent chooses actions and assesses results; no child agent is required. Prefer suitable existing emulators for missing device coverage, following setup. Retain per-session usage notes for API/docs gaps and concrete fallbacks.

For local builds/tests, honor the configured `brave-scaffold` opt-in and load its selected installation's maintained build skill. Ordinary merged-fix QA uses current Nightly. Implementation validation uses the actual changed APK; runtime-backed technical review uses the pinned PR build. Preserve that source/artifact identity when moving between workflows, rather than silently substitute Nightly. Review does not implicitly authorize product fixes, and code-only review does not imply checkout/sync/build/device actions.

## Finish the requested work

Requests to “produce a QA verification,” “create a QA report” or “create a QA evidence pack” select [saved QA delivery](../../../docs/reporting.md#requested-qa-delivery), unless the user specifies another format. For implementation followed by QA, use [development delivery](../../../docs/develop.md#requested-qa-evidence-pack), continuing through changed-build installation/runtime assessment and HTML/capture/context export. Theme/orientation fixes need the corresponding runtime demos within the requested scope. An implemented or committed change alone does not establish successful behavior.

Use `brave-core-bart-report` when a report, assessment, prototype demonstration or draft PR is useful/requested; read its [instructions](../brave-core-bart-report/SKILL.md) directly if native loading is unavailable. A technical review reports findings first through [review reporting](../../../docs/reporting.md#technical-review-report). Local development without a requested QA deliverable can end with a concise summary; verification ends with its scoped assessment in the requested form. Publication follows the explicit request and resolved destination, with previews distinguished from actual PR delivery.

Use `brave-core-bart-reproduce` for useful/requested future-attempt instructions through its [guidance](../brave-core-bart-reproduce/SKILL.md). Package creation, extra live reuse and sharing remain separate scopes. Supporting skills are instructions followed in this session, not compulsory workflow stages.

Continue authorized iteration until requested work is completed or a concrete blocker prevents it. Preserve failures and unassessed scope. Report when no change is warranted, which revision/build was reviewed/tested and where the retained results live; do not manufacture a fix, pass verdict, clean comprehensive review or published artifact.
