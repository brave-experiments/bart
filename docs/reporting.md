# Reporting and delivery

Deliver the result the user requested, with conclusions supported by inspectable observations. Select the form and depth for the audience; do not turn every task into a broad QA report.

## Local development summary

A local feature/prototype/fix request normally finishes with a concise session summary: what changed and where, checks/tests run, actual build/device and observed app behavior when exercised, evidence locations and remaining limits. State requested work that remains blocked or unrun. Save a separate document only when useful or requested.

Local delivery does not require a QA-style assessment, published media, PR or reproduction package. Keep the same evidence standards and build-identity distinctions for behavior claims. Follow request/Core/host conventions for local commits; keep a local-only task local even if publication defaults exist. If a formal QA assessment is requested, use the form below.

## Assessment and investigation

An automated assessment must state: **Automated BART assessment - not an official QA sign-off.** Use Brave QA's concise device/build, steps, actual results and media conventions.

Include relevant device/Android, Brave/Chromium versions, actual build/source relationship, starting conditions, checks performed, intended versus observed results, useful evidence and omissions. An investigation also names the source-backed mechanism/hypothesis, conflicts, next action and limits. Do not confuse reports by others with observations from this attempt.

For normal QA, describe current-Nightly behavior on the actual tested version. Keep a PR's first-containing release as source context, not a claimed tested build. Absence of a historical control limits causal attribution; it does not itself make present-day behavioral verification incomplete.

Use per-check `pass`, `fail`, `blocked`, `inconclusive` and `not run`, with reasons. An overall `partial` assessment means coverage is incomplete. Preserve mixed outcomes and relevant failures. Keep these distinctions explicit:

- Successful command versus successful app behavior.
- Intended behavior versus observed result.
- A containing release versus exact PR build.
- Not reproduced under tested conditions versus disproof of a bug.
- Observed improvement versus evidence that the change caused it.
- Completed checks versus omitted/blocked checks.
- App assessment versus publication status.

## Verification summary format

Start a QA verification report with the compact summary below, before detailed source analysis, attempt logs or the full check matrix. Use the same order in Markdown comments and local HTML. Keep the unofficial BART notice immediately beside the headline so the familiar QA format does not imply official sign-off.

Use `#### <emoji> Verification <OUTCOME> using the following:` in Markdown, or an equivalent visible heading in HTML. Select the emoji and outcome from the assessment, not command completion:

| Headline | Meaning |
| --- | --- |
| 🟢 Verification PASSED | The stated behavioral scope was exercised and met expectations. Qualify a scoped pass immediately; do not imply broader coverage. |
| 🔴 Verification FAILED | An assessed behavior did not meet expectations. Preserve the failure even if another check passes or coverage is incomplete. |
| 🟠 Verification BLOCKED | A prerequisite prevented a meaningful attempt of the stated scope. |
| 🟡 Verification INCONCLUSIVE | An attempt was made, but observations cannot settle the stated behavioral expectation. |
| 🟡 Verification PARTIAL | Some scope was assessed, with remaining selected checks unrun/blocked and no observed failure hidden by this label. Describe individual outcomes. |

These non-pass emoji are BART's reporting convention; the linked examples establish the green-pass format. Always include the outcome text so color/emoji is not the only signal. A scoped pass can list unrequested historical or internal checks as limitations without claiming they were required for present-day QA.

Below the headline, show a compact **Device/OS and Brave identity block**. In HTML, render a small two-column field/value table: Device/OS, Brave Build, Chromium, Channel/architecture, Revision/build relationship and Scope/conditions. Use actual observed values; include Android OS build when available and write unknown values with their limits rather than invent them. Avoid burying the tested version in a long provenance paragraph. Link full artifact/installation receipts from the detail section.

Then use these visible section labels:

- **STEPS:** numbered actions actually performed. Link the specific STR (steps to reproduce) or TP (test plan) used, plus material variations. “Follow STR/TP; verify” is enough only when that linked procedure describes the actual trigger; otherwise summarize the decisive actions, setup and observation. Record an ADB/API trigger explicitly when used.
- **ACTUAL RESULTS:** short, concrete observed-behavior bullets. Tie results to tested variants and state important failure, uncertainty or omitted scope here, not only in a collapsed detail section.
- **SCREENSHOT / SCREENCAST:** relevant labeled captures. Use a comparison table or responsive side-by-side media grid when variants benefit from it, such as Signed out / Signed in or System light / System dark. A single decisive clip is sufficient when it shows the scope clearly; do not require extra variants or duplicate media just to fill a table.

An illustrative Markdown summary follows. Replace the outcome and placeholders from evidence; this is not a recorded pass:

```markdown
#### 🟢 Verification PASSED using the following:

Automated BART assessment - not an official QA sign-off.
Scope: <behavior/variants assessed; important limits>

Device/OS:
- <model / Android version / OS build when observed>

Brave:
- Build: <observed Brave version>
- Chromium: <observed Chromium version / build type / architecture>
- Channel: <observed channel>
- Revision/build relationship: <observed revision; current Nightly containing fix>

#### STEPS:
1. Follow <specific STR/TP link>; <material setup or variation>.
2. <decisive action and observation, including actual trigger>.

#### ACTUAL RESULTS:
- Verified <concrete behavior under tested conditions>.
- <failure, uncertainty or omitted scope where relevant>.

#### SCREENSHOT / SCREENCAST:

| <tested condition A> | <tested condition B> |
|:-:|:-:|
| <relevant image/video link> | <relevant image/video link> |
```

The explicit headline/section layout comes from QA comments on [57449](https://github.com/brave/brave-browser/issues/57449#issuecomment-6005588417) and [57747](https://github.com/brave/brave-browser/issues/57747#issuecomment-5345309104). Other concise examples are [57872](https://github.com/brave/brave-browser/issues/57872#issuecomment-5607870886), [58827](https://github.com/brave/brave-browser/issues/58827#issuecomment-5637985692) and [58370](https://github.com/brave/brave-browser/issues/58370#issuecomment-5728374687). These are format/coverage references, not BART evidence. [QA resources](qa-resources.md) supplies optional regression context; do not apply official QA labels or sign-off merely because the assessment passes.

## Additional measurement evidence

After the standard verification summary, include a measurement table when useful, with the measured property, actual values for each observed build/condition, units/method and evidence references. A single current-build column is valid; before/after columns are appropriate only when both were actually measured. State source-derived expectations separately from measured values.

Keep this section factual: describe what was measured and observed, including unavailable properties and uncertainty. Do not add a measurement-derived conclusion, “proof of fix,” inferred internal state or causal claim. A separate requested QA assessment keeps its own scope and evidence limits. Follow [measurement guidance](evidence.md#measured-observations) for source/coordinate distinctions and retained receipts.

## Local HTML verification report

When the user requests HTML with local captures, create a dedicated attempt directory containing `report.html` and the assets/receipts that support it. Use embedded CSS and minimal optional JavaScript; no CDN, remote font or hosted app media should be required to read the assessment. The report plus its relative local assets is the portable deliverable; embedding large media into one file is unnecessary.

```text
<attempt>/
  report.html
  notes.md
  androperator-usage-notes.md
  builds/                 # artifact selection/identity and installation receipts
  evidence/               # retained capture bundles, original images/video and receipts
```

Create directories as their contents arise. Retain the selected APK under `builds/` or reference a local cache in its receipt; the report must identify its origin/hash/source relationship without requiring the binary just to read the report. Copy useful capture bundles into the attempt or retain them there initially, preserving original manifest hashes/relative contents. Reference Androperator's actual log files/IDs in usage notes rather than copy its entire logs. Keep ordinary task notes distinct from those tool-feedback notes.

Use the [verification summary format](#verification-summary-format) at the top: emoji/outcome heading and unofficial notice, compact build/device table, STEPS, ACTUAL RESULTS and labeled media. Make the first viewport show the PR/issue, scoped outcome, key limits and tested identity; place the full check matrix, provenance and attempt history after this concise summary. Keep summary media useful and readable, with additional galleries below when needed. Include:

- Tested build/device and supported relationship to the change, relevant setup and conditions, and local receipt links.
- The checks actually performed, steps, expected/observed behavior, individual outcomes and omitted/blocked checks. Separate source/test assertions from observed app behavior.
- A readable, labeled screenshot gallery and playable `<video controls>` clips where transitions matter, with download/open links and captions identifying build/condition/attempt. State missing decisive media; do not manufacture captures for skipped work.
- Relevant failures, mixed results, coverage/causal limits and links to supporting receipts and session usage notes. Label imported reference media as reported behavior, not observations from this run.

State how decisive video was inspected, including sampled-frame inspection rather than continuous playback when applicable. Put any resulting timing/transition limit with the media/results it affects, not only in a footer. Presentation must not make uninspected intervals look verified.

When captures contain [on-device labels](evidence.md#on-device-capture-labels), identify them as BART/Operator annotations. An announced action or displayed version label does not replace observed results and build receipts. Do not present annotation text as app-generated content.

Write a final blocked or partial HTML report even if the APK, target, prerequisites or capture fails, using available evidence and specific next actions. Do not leave a success-looking placeholder. Verify that the HTML opens locally and all report media/receipt references resolve inside the delivered directory; inspect rendered layout/media with available tools and state any unperformed visual check. Finish with the report's absolute path, assessed outcome and important remaining scope. Local delivery includes no GitHub upload, PR comment or reproduction package unless separately requested.

## Prototype and draft PR

Read the target Core repository's current template and relevant review practices. Explain the problem, focused change, rationale, issue relationship, actual validation and known prototype limits. Keep tests with the behavior they establish and report missing runtime coverage.

Use labeled before/after media when supported, identifying actual builds and matched conditions. Include ordinary reproduction steps and unusual setup that affects reviewers. [PR 39221](https://github.com/brave/brave-core/pull/39221) illustrates a media table and a fixed-tablet-taskbar prerequisite; it does not make that prerequisite universal.

For a real PR, select the base repository/branch and actual head repository/branch explicitly, inspect all included commits and the diff, and follow host/Core signing and publication rules. A local branch/description or opened form is not a delivered draft PR. If no change is warranted, report the supported finding instead of making an empty PR.

## Delivery scope

| Request | Completion |
| --- | --- |
| Develop locally | Focused implementation, requested checks/build/install/runtime inspection and a concise local summary, or specific blockers/limits. No automatic push or publication. |
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
