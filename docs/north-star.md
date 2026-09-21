# bart north star

**bart means Brave Automated Runtime Tester.** Given a Brave Android issue or PR, an agent should exercise the relevant behavior through Clawperator and deliver evidence that lets a QA reviewer assess the conclusion.

## Target invocation

> Run the `/bart-verify` skill on PR https://github.com/brave/brave-core/pull/39794

Support both reproducing a reported issue and verifying that a PR fixes it. Failure to reproduce means the issue was not observed under the tested conditions; it does not establish that the report is invalid.

Claude Code directs and assesses runtime verification. The eventual orchestrator coordinates context gathering, build/device preparation, workflow development, verification captures, and reporting. Implement those phases incrementally as described in the [plan](plan.md).

## Reviewable result

Produce concise, named videos of assessed verification attempts, supporting screenshots, and a report containing device/build identity, steps, expected and actual behavior, and omitted checks. Keep exploratory workflow development separate from the main videos and preserve relevant failures.

For #39794, provide captures named `kBraveYoutubeFullscreenSettingsWorkaround - Disabled` and `kBraveYoutubeFullscreenSettingsWorkaround - Enabled`. The enabled expectation is fullscreen exit followed by settings opening without agent rescue. If both variants work, report that the control did not reproduce the issue and attribution remains inconclusive.

The [README's illustrative QA comment](../README.md#intended-result) shows the intended output, following the device/build, steps, actual-results, and screencast structure of [this Brave QA verification](https://github.com/brave/brave-browser/issues/57747#issuecomment-5345309104). It is a format example, not a recorded BART pass.

A completed assessment can report a product failure. Blocked setup, uncertain observations, and missing evidence must remain explicit. Agent exit codes and artifact hashes cannot establish behavioral correctness.

Reports are local first. GitHub posting is a later delivery capability. The project is in planning, and `/bart-verify` does not exist yet.
