# Reporting and delivery

Deliver the result the user requested, with conclusions supported by inspectable observations. Select the form and depth for the audience; do not turn every task into a broad QA report.

## Local development summary

A local feature/prototype/fix request normally finishes with a concise session summary: what changed and where, checks/tests run, actual build/device and observed app behavior when exercised, evidence locations and remaining limits. State requested work that remains blocked or unrun. Save a separate document only when useful or requested.

Local delivery does not require a QA-style assessment, published media, PR or reproduction package. Keep the same evidence standards and build-identity distinctions for behavior claims. Follow request/Core/host conventions for local commits; keep a local-only task local even if publication defaults exist. If a formal QA assessment is requested, use the form below.

## Assessment and investigation

An automated assessment must state: **Automated BART assessment - not an official QA sign-off.** Use Brave QA's concise device/build, steps, actual results and media conventions.

Include relevant device/Android, Brave/Chromium versions, Androperator CLI version used, actual build/source relationship, starting conditions, checks performed, intended versus observed results, useful evidence and omissions. An investigation also names the source-backed mechanism/hypothesis, conflicts, next action and limits. Do not confuse reports by others with observations from this attempt.

Include available execution context for the agent producing the report: model name/ID, harness/client and version, and thinking/reasoning mode or effort setting. Use values exposed by the current session or inspected runtime metadata, not guesses from response style, model aliases or a default configuration that may have been overridden. Mark unavailable details as not exposed; distinguish a configured setting from a confirmed effective setting. For multiple contributing sessions, identify which context applies to which checks. Exclude credentials, account identifiers and private session tokens.

Never include personally identifying information in bug reports, QA assessments, PR descriptions or their shared attachments. Identify a physical device by make/model and Android version/build, not its serial number. Redact serials from command examples, receipts, screenshots, videos and other report-linked assets; use `<device-serial>` in commands. Exact serials may remain in ignored local configuration or private execution receipts needed to target the device, but must not appear in the report or its shareable assets, including local HTML reports. Inspect selected content before delivery and retain original diagnostic evidence privately.

Run the [export privacy helper](export-privacy.md) on the complete delivery directory before delivering a local QA report/evidence pack or publishing report-linked assets. Include task-selected device IDs, visually review media and resolve all findings in contents, filenames and directory names. Recheck after any delivery change or final ZIP creation.

For normal QA, describe current-Nightly behavior on the actual tested version. Keep a PR's first-containing release as source context, not a claimed tested build. Absence of a historical control limits causal attribution; it does not itself make present-day behavioral verification incomplete.

Use per-check `pass`, `fail`, `blocked`, `inconclusive` and `not run`, with reasons. An overall `partial` assessment means coverage is incomplete. Preserve mixed outcomes and relevant failures. Keep these distinctions explicit:

- Successful command versus successful app behavior.
- Intended behavior versus observed result.
- A containing release versus exact PR build.
- Not reproduced under tested conditions versus disproof of a bug.
- Observed improvement versus evidence that the change caused it.
- Completed checks versus omitted/blocked checks.
- App assessment versus publication status.

## Human-readable overview and reproduction

Near the top of a saved assessment, development evidence pack or technical review, include a **User facing changes** section. In one short paragraph or a few bullets, state the problem a person encounters and the intended visible difference, following the user-impact principle in PR descriptions. Distinguish implemented intent from observed validation: an accessibility-label check is not a rendered-tooltip check, and a passing build does not establish either. For a review without an implementation, describe the proposed change and observed user impact. If there is no visible change, say so with the reason. Keep source/build mechanics in the details.

Follow with a **Reproduction and verification guide** that a reader can use without the conversation or execution log. State reproduction difficulty factually: which attempts reproduced it, which did not, conditions that mattered and unresolved triggers. Use counts or timing only when retained; do not claim “easy” or “reliable” from a single attempt. If the symptom was not reproduced, say that clearly instead of treating a source diagnosis as observed reproduction.

Give concrete setup, the actual app entry point, relevant state/input and numbered human actions, with expected/observed behavior at the important steps. Keep these separate from implementation actions such as editing strings, generating translations, building or recovering an emulator. Explain whether custom scripts, extensions, pages, mouse input, injected events or other special tooling are necessary or merely aids. Link their text/source in the context pack, with exact invocation, dependencies and scripted behavior; distinguish a scripted trigger from the ordinary user route and state when the latter remains unverified. Describe unsuccessful substitute triggers where they affect interpretation, not every exploratory command.

The standard STEPS section can serve as this guide when concise, or summarize/link to it when setup is longer. Do not leave reviewers to infer reproduction from a chronological list of source edits and tool attempts. Keep the key difficulty and unmet behavioral check visible near the headline; put detailed attempt history, diagnostic commands and technical reasoning afterward.

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

Below the headline, show a compact **Device, build and conditions block**. In HTML, render a small two-column field/value table: Device/OS, Brave Build, Chromium, Channel/architecture, Revision/build relationship, Androperator, Agent execution context and Scope/conditions. The agent-context row names the available model, harness/version and reasoning mode/effort, with unavailable values stated concisely. The Androperator row identifies the CLI version used in the tested session. Operator version/package details belong in supporting setup receipts or usage notes when relevant, not the summary. Use actual observed values; include Android OS build when available and write unknown values with their limits rather than invent them. Avoid burying tested versions in a long provenance paragraph. Link full artifact/installation receipts from the detail section.

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

Androperator:
- CLI: <observed version>

Agent execution context:
- Model: <session-exposed name/ID, or not exposed>
- Harness: <client and available version>
- Reasoning: <effective mode/effort when exposed, or configured/unconfirmed/not exposed>

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

## Configuration coverage evidence

Include evidence for configuration checks in the report, not only a claim that they were tested. After the standard QA summary and primary media, show a compact table with configuration, actual observed result/outcome and evidence links. Use entries such as phone portrait, phone landscape, after system theme change, tablet portrait and tablet landscape, following [verification scope](verify.md#configuration-coverage). Name actual tested devices by make/model and record relevant conditions; never include physical serials. Mark blocked, omitted or inapplicable checks with reasons rather than empty evidence cells implying success.

Show useful labeled captures for each exercised configuration in a comparison grid or expandable supporting section. Use screenshots for visible layout and clips for scrolling, recreation or interaction claims. One clip can support several checks; link the same capture instead of duplicating media. Include relevant successful coverage even when it adds report length: reviewers should be able to inspect what landscape/tablet testing actually looked like.

Keep the main finding and decisive capture near the headline. Additional observed defects belong prominently in ACTUAL RESULTS with their captures, separately identifying the original fix's result and affected configuration. Do not hide them in a collapsed successful-coverage appendix. Repeated captures adding no information and raw diagnostic logs remain local supporting material, linked selectively. Preserve original/failed attempts under [evidence guidance](evidence.md).

An illustrative coverage table, not claimed results:

| Configuration | Actual result/outcome | Evidence |
| --- | --- | --- |
| Phone portrait | <observed behavior> | <capture> |
| Phone landscape | <layout and usability observations> | <capture/clip> |
| After system theme change | <restoration and control observations> | <clip> |
| Tablet portrait | <tablet layout/controls observed> | <capture> |
| Tablet landscape | <observations or specific blocker> | <capture or not run reason> |

## Context attachment

Include a [text-only context ZIP](report-context.md) with requested published QA reports, and prepare it for local QA reports intended for publication. It contains useful reproduction/verification context, commands or adaptive instructions, any local test inputs/helper source and sanitized text receipts. Media and APKs remain separate. Link its long unique filename locally, and its confirmed attachment URL when posted; state missing context or delivery blockers.

This attachment packages useful material from the work. It does not require a formal reproduction skill or another live session. Optional skill authoring/replay remains separately scoped under [reproduction](reproduction.md).

## Additional measurement evidence

After the standard verification summary, include a measurement table when useful, with the measured property, actual values for each observed build/condition, units/method and evidence references. A single current-build column is valid; before/after columns are appropriate only when both were actually measured. State source-derived expectations separately from measured values.

Keep this section factual: describe what was measured and observed, including unavailable properties and uncertainty. Do not add a measurement-derived conclusion, “proof of fix,” inferred internal state or causal claim. A separate requested QA assessment keeps its own scope and evidence limits. Follow [measurement guidance](evidence.md#measured-observations) for source/coordinate distinctions and retained receipts.

## Local HTML verification report

When the user requests HTML with local captures, create a dedicated attempt directory containing `report.html` and the assets/receipts that support it. Use embedded CSS and minimal optional JavaScript; no CDN, remote font or hosted app media should be required to read the assessment. The report plus its relative local assets is the portable deliverable; embedding large media into one file is unnecessary.

Use the [illustrative HTML report](examples/qa-report.html) as the minimum presentation structure, adapting it to actual scope and evidence. It demonstrates readable styling, identity, steps/results, inline media, coverage and context sections; it contains no test results or real media. Replace placeholders and omit irrelevant sections, but do not replace a requested evidence pack with a few unstyled paragraphs and opaque numbered capture links. Display the relevant inspected screenshots inline with descriptive captions and full-image links, and embed required demo clips using `<video controls>` plus open/download links. A source explanation and screenshot table alone do not constitute transition evidence.

For theme-dependent bugs, include the [required theme demo](evidence.md#theme-change-bugs) prominently under SCREENSHOT / SCREENCAST, including in a development evidence pack. If it could not be recorded or inspected, state the concrete reason near the headline/results and mark theme-transition evidence incomplete. Do not omit video silently or describe after-toggle screenshots as a completed demo.

For orientation-dependent bugs, include the [required rotation demo](evidence.md#orientation-change-bugs) in the same prominent section, showing the transition and relevant resulting layout/interaction. Identify directions actually exercised and any missing reverse/other configuration scope. If footage is missing or uninspected, state the blocker and incomplete rotation verification near the results; separate supporting final-orientation screenshots from transition evidence.

```text
<attempt>/
  report.html
  notes.md
  androperator-usage-notes.md
  builds/                 # artifact selection/identity and installation receipts
  evidence/               # retained capture bundles, original images/video and receipts
```

Create directories as their contents arise. Retain the selected APK under `builds/` or reference a local cache in its private receipt; the report identifies origin/hash/source relationship without requiring the binary to read it. Keep original capture bundles and their hashes intact privately. Link only reviewed, privacy-safe media and sanitized text receipts from the delivered report, labeling redacted copies and their relationship to originals. Do not expose a raw manifest or usage-note file containing target serials merely because it is local. Reference actual log files/IDs in private usage notes rather than copy entire logs; export only relevant sanitized context.

Use the [verification summary format](#verification-summary-format) at the top: emoji/outcome heading and unofficial notice, compact build/device table, STEPS, ACTUAL RESULTS and labeled media. Make the first viewport show the PR/issue, scoped outcome, key limits and tested identity; place the full check matrix, provenance and attempt history after this concise summary. Keep summary media useful and readable, with additional galleries below when needed. Include:

- Tested build/device and supported relationship to the change, relevant setup and conditions, and local receipt links.
- The checks actually performed, steps, expected/observed behavior, individual outcomes and omitted/blocked checks. Separate source/test assertions from observed app behavior.
- A readable, labeled screenshot gallery and playable `<video controls>` clips where transitions matter, with download/open links and captions identifying build/condition/attempt. State missing decisive media; do not manufacture captures for skipped work.
- Relevant failures, mixed results, coverage/causal limits and links to supporting receipts and session usage notes. Label imported reference media as reported behavior, not observations from this run.

State how decisive video was inspected, including sampled-frame inspection rather than continuous playback when applicable. Put any resulting timing/transition limit with the media/results it affects, not only in a footer. Presentation must not make uninspected intervals look verified.

Before finalizing, check evidence completeness against each reported check: actual per-device build identity, relevant full-screen/end-of-list coverage and decisive transition footage/inspection where needed. Follow the owning [build](builds.md), [verification](verify.md#inspect-the-whole-affected-ui-group) and [capture](evidence.md#choose-observation-points) guidance. Finding one defect does not complete remaining selected checks or justify weaker evidence for other results. Distinguish missing evidence from observed failure, keep the available observations useful, and state unresolved coverage prominently rather than turn it into a pass through wording.

When captures contain [on-device labels](evidence.md#on-device-capture-labels), identify them as BART/Operator annotations. An announced action or displayed version label does not replace observed results and build receipts. Do not present annotation text as app-generated content.

Write a final blocked or partial HTML report even if the APK, target, prerequisites or capture fails, using available evidence and specific next actions. Do not leave a success-looking placeholder. Check that the HTML is readable and all report media/receipt references resolve inside the delivered directory. Inspect rendered layout/media when an already available browser tool supports it; state any unperformed rendering check. Finish with the report's absolute path, assessed outcome and important remaining scope. Local delivery includes no GitHub upload or PR comment; a text-only context ZIP follows the request and [context attachment scope](#context-attachment), while new reproduction-skill authoring remains optional.

Do not search, enumerate or read application bundles under `/Applications` or `~/Applications`, or request access to them, just to render a report. On macOS, use the system opener with a quoted report path, such as `open "/absolute/path/to/report.html"`, when opening the saved report is useful. It selects the associated browser without application-directory inspection. Opening the browser does not establish that layout or playback was visually checked. If no permitted rendering tool is available, mark rendering not checked and deliver the report; do not turn optional report presentation checks into a setup blocker.

## Prototype and draft PR

Read the target Core repository's current template and relevant review practices. Explain the problem, focused change, rationale, issue relationship, actual validation and known prototype limits. Keep tests with the behavior they establish and report missing runtime coverage.

Include the [user-facing overview and reproduction guide](#human-readable-overview-and-reproduction) in the supporting report/evidence pack. A PR description follows its repository's template and includes an explicit `User impact:` line or equivalent required field; do not substitute build-script details for the visible change reviewers need to understand.

Use labeled before/after media when supported, identifying actual builds and matched conditions. Include ordinary reproduction steps and unusual setup that affects reviewers. [PR 39221](https://github.com/brave/brave-core/pull/39221) illustrates a media table and a fixed-tablet-taskbar prerequisite; it does not make that prerequisite universal.

For a real PR, select the base repository/branch and actual head repository/branch explicitly, inspect all included commits and the diff, and follow host/Core signing and publication rules. A local branch/description or opened form is not a delivered draft PR. If no change is warranted, report the supported finding instead of making an empty PR.

## Technical review report

Lead with the reviewed PR/revision, requested code-only/runtime-backed scope, material findings and critical coverage limits, not a QA pass headline. State that this is an automated BART technical review, not official approval or QA sign-off. Include available agent execution context and follow the same report privacy rules.

For each finding, give priority, impact, pinned source location, observed or source-backed evidence, useful reproduction/fixture instructions and uncertainty. Distinguish runtime-reproduced defects, source-only findings and unresolved hypotheses. If no material findings remain, say so for the assessed scope; do not equate a successful build or incomplete runtime testing with a clean comprehensive review.

Follow with actual checkout/Core/Chromium/build/device identity, flags/prerequisites, commands/tests and experiments performed, configuration coverage, readable captures/demos, restoration and blocked/unrun checks. Use the local HTML example's styling/identity/media structure with findings-first review sections; QA summary formatting applies only to a separately labeled behavioral assessment. Link a sanitized text-only context ZIP when an evidence pack/export or publication is requested, including authored fixtures/source and commands. Raw media/binaries remain separate. Apply existing link, archive and permitted rendering checks; keep delivery status distinct from review findings.

## Delivery scope

| Request | Completion |
| --- | --- |
| Develop locally | Focused implementation, requested checks/build/install/runtime inspection and a concise local summary, or specific blockers/limits. No automatic push or publication. |
| Implement and create a QA evidence pack | Changed-build runtime assessment plus local HTML, captures, receipts and text-only context ZIP under [development delivery guidance](develop.md#requested-qa-evidence-pack). Commit only when requested or required by Core/host rules; no automatic publication. |
| Technical review | Findings for the requested code/runtime scope and explicit coverage limits; runtime preparation/experiments follow [review guidance](review.md). No implicit product fixes or GitHub approval/publication. |
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
