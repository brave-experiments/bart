# Reporting and delivery

Deliver the result the user requested, with conclusions supported by inspectable observations. Select the form and depth for the audience; do not turn every task into a broad QA report.

## Assessment and investigation

An automated assessment must state: **Automated BART assessment - not an official QA sign-off.** Use Brave QA's concise device/build, steps, actual results and media conventions.

Include relevant device/Android, Brave/Chromium versions, actual build/source relationship, starting conditions, checks performed, intended versus observed results, useful evidence and omissions. An investigation also names the source-backed mechanism/hypothesis, conflicts, next action and limits. Do not confuse reports by others with observations from this attempt.

Use per-check `pass`, `fail`, `blocked`, `inconclusive` and `not run`, with reasons. An overall `partial` assessment means coverage is incomplete. Preserve mixed outcomes and relevant failures. Keep these distinctions explicit:

- Successful command versus successful app behavior.
- Intended behavior versus observed result.
- A containing release versus exact PR build.
- Not reproduced under tested conditions versus disproof of a bug.
- Observed improvement versus evidence that the change caused it.
- Completed checks versus omitted/blocked checks.
- App assessment versus publication status.

A compact example, with placeholders rather than claimed results:

```markdown
## Automated BART assessment - not an official QA sign-off

Scope/outcome: <checks assessed and outcome>
Device/OS: <model / Android>
Brave / Chromium: <versions>
Build/source: <artifact and supported relationship to change>
Conditions: <relevant flags, settings and setup>

### Checks and actual results
- <action>: expected <behavior>; observed <result>; <outcome>.
- Not run/blocked: <scope and reason>.

### Evidence
- <readable screenshot or decisive clip>

Limits: <coverage, trigger or causal uncertainty>
Delivery: <returned locally, posted URL or blocker>
```

For format references, see QA comments on [57872](https://github.com/brave/brave-browser/issues/57872#issuecomment-5607870886), [58827](https://github.com/brave/brave-browser/issues/58827#issuecomment-5637985692) and [58370](https://github.com/brave/brave-browser/issues/58370#issuecomment-5728374687). They are examples, not BART evidence. Do not apply official QA labels or sign-off merely because the assessment passes.

## Prototype and draft PR

Read the target Core repository's current template and relevant review practices. Explain the problem, focused change, rationale, issue relationship, actual validation and known prototype limits. Keep tests with the behavior they establish and report missing runtime coverage.

Use labeled before/after media when supported, identifying actual builds and matched conditions. Include ordinary reproduction steps and unusual setup that affects reviewers. [PR 39221](https://github.com/brave/brave-core/pull/39221) illustrates a media table and a fixed-tablet-taskbar prerequisite; it does not make that prerequisite universal.

For a real PR, select the base repository/branch and actual head repository/branch explicitly, inspect all included commits and the diff, and follow host/Core signing and publication rules. A local branch/description or opened form is not a delivered draft PR. If no change is warranted, report the supported finding instead of making an empty PR.

## Delivery scope

| Request | Completion |
| --- | --- |
| Verify | Return an evidence-backed assessment in the session or useful saved document. No automatic posting, edits or package. |
| Verify and post findings | Assessment plus publication at the resolved destination with accessible evidence and confirmed URL, or a precise delivery blocker. |
| Prototype in a draft PR | Warranted change/validation and a real draft PR; if no change is warranted, report that supported conclusion. |
| Publish a prototype preview to BART | Preview description/media in the selected BART issue, labeled as a preview. |
| Write reproduction instructions | Optional package; live reuse testing and sharing are separate unless requested. |

Resolve defaults using [configuration](setup.md#configuration). `publication.qa` handles assessment/investigation comments on an issue or PR. `publication.pr` handles an issue preview or creation of a real draft PR. Production QA defaults can use Browser issues while PR creation uses Core. A PR verification can research Core and report to its linked Browser issue.

An explicit posting destination overrides the relevant default, including “post findings on this PR.” State any override of development settings. A URL supplied only for research is not posting authority. Resolve the exact item in its repository; bare issue numbers are not portable. Commenting on an existing item and creating a new issue are distinct scopes. Create a task-specific BART issue only when the chosen publication exercise covers that action; do not replace a requested PR comment with a new issue.

Development defaults route both categories to BART issues. If that conflicts with requested delivery, state at task start: “Development configuration will publish a preview to BART instead of creating a Core PR.” Continue useful work while resolving the delivery scope. A preview completes an explicitly selected preview exercise, not the original draft-PR request. Leave actual delivery outstanding when that request remains in force; do not silently change config or fall back to upstream.

## Publication

Use the host's available, authorized tools. Config selects a default destination, not permission to upload or post. If the host permits only reads or lacks delivery tools, retain the draft and selected media and provide a precise human handoff. No permanent manual step or BART uploader is required.

Prefer supported GitHub-native attachments for requested GitHub delivery. Inspect the installed client's help before using media flags; current [CLI attachment docs](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli) may describe capabilities absent from an older client. Use existing `gh`/publication workflows, with explicit repository and item or PR base/head selections. Avoid implicit pushes or a supposed dry run that can publish source.

For attachments unsupported by the client, a supported [browser attachment](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) route or necessary human handoff can deliver selected media/ZIP. Uploading itself is publication, even before submitting the comment. Public-repository attachments are accessible publicly; select task-appropriate evidence and omit unrelated local paths, account data and working logs.

Inspect selected media using [evidence](evidence.md). Save the uploaded URLs, rewrite the delivery copy's local references and confirm accessibility/rendering for the audience. Confirm the final issue/comment/PR URL and real draft state where applicable. Preserve local drafts and user's edits after failure. Retrying publication reuses saved evidence and does not rerun device work or change the assessment.
