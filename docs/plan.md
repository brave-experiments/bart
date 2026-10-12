# BART implementation and validation

The repository contains three current-agent skills, shared guidance and an optional local TOML configuration example. Live workflow coverage remains to be established. These milestones track development of BART; they are not stages each user request must follow.

## Core pivot

| Work | Status | Completion evidence |
| --- | --- | --- |
| Skills-first purpose, three skill bodies and shared guidance | Implemented | Outcome-led instructions, independent development/verification guidance and optional reporting/reproduction scopes. |
| Local configuration and independent QA/PR destinations | Implemented as instructions | Missing config supported; configured checkout and posting defaults are separate from the research target. |
| Preparation CLI, child-agent runtime and schemas | Removed | No active skill depends on them; useful source/build/evidence knowledge lives in focused docs. |
| Local project skill discovery | Checked in OpenCode 1.19.0 | Native `opencode debug skill` found all three runtime skills in this checkout; this does not establish slash invocation or discovery from Core. |
| Personal skill discovery from Core | Checked in OpenCode 1.19.0 | Native discovery from a Core checkout found all three personal skill links; actual fresh-session invocation and source/app execution remain untested. |
| Primary-host discovery and useful execution | Not yet demonstrated in a fresh Core session | Load the main skill and linked docs from Core, then complete a bounded source/app task through Androperator. |

Complete this milestone after a fresh primary host demonstrates discovery and useful source/app execution. Repository checks alone do not prove it.

## Workflow validation

- Develop a feature from a plain request in a fresh Core session without prior BART conversation history or a GitHub URL. Demonstrate local edit/check/build/install/inspect work and a concise summary without publication. Exercise a requested discussion checkpoint and developer feedback without adding routine checkpoints to autonomous execution.
- Investigate an issue and prototype when warranted. Start with an ordinary request such as issue `59445`; determine scope from current source and observations. Demonstrate focused edits, appropriate checks, local build/install and runtime inspection on a suitable case. If the issue is already fixed, finish that investigation honestly and select another suitable case within the agreed work scope.
- Understand a merged PR and assess current Nightly. PR `40517` is an example to try. Produce an evidence-backed scoped assessment, without assuming code edits, posting or packaged replay. A newer current Nightly containing the fix is the normal QA target; exact-head/historical testing is a distinct scope.
- Tighten guidance from observed failures or missed prerequisites. Keep task-specific research and execution evidence in the selected task directory. Do not add mandatory outputs to every request.

These workflows are pending live validation. Product failure, non-reproduction and setup blockers receive honest assessments; mark unexercised behavior separately from workflow coverage. Local developer use and autonomous issue/PR work share the same skills and evidence standards.

## Independent integrations

| Integration | Status | What to demonstrate |
| --- | --- | --- |
| Additional host discovery | Pending | Native discovery and linked-document access from a fresh Core session. |
| Exact PR APK retrieval | Pending | Existing job/artifact route, actual revision and APK identity; distinguish head, merge and containing release. |
| Requested publication | Pending | Explicit destination, accessible media and confirmed issue/comment URL; development reports/PR previews go to configured BART issues. |
| Actual draft PR creation | Pending | Real PR URL and draft state in the selected base repository; a preview does not prove this. |
| Reproduction-package reuse | Pending | An explicitly requested package followed by an independent fresh attempt, with historical results separate. |

Missing integration access does not undo a completed core or workflow milestone. The APK service referred to as StoryBoard needs an identified supported route before instructions can claim it works. Use [build guidance](builds.md) and [reporting](reporting.md) for supported approaches and limits.
