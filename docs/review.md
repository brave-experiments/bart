# Runtime-backed technical review

Assess a PR/change through source and, when requested, the running app. Complete with actionable findings, reproducible experiments and clear unassessed scope. A review with no material findings describes the examined scope; it is not universal correctness or official approval.

## Scope and review questions

Code-only review uses source/requirements/discussion and available test evidence without changing checkout/device state. Runtime-backed review explicitly covers selected checkout/PR preparation, dependency sync, build, tests, install and experiments. Follow host/Core authority; configuration selects tools/targets rather than grants those operations. Preserve local work, and continue authorized steps without repeating confirmations.

Read PR commits/diff, linked issues/design, tests and relevant review feedback using [understand](understand.md). Pin head/base and distinguish changes since earlier findings. Identify important claims and failure paths: activation/default-off state, lifecycle/recreation, persistence, configuration-only UI, compatibility and error recovery as the change warrants. Do not prescribe one broad matrix for every PR or limit experiments to the author's happy-path demo.

Historical comments and attached fixtures are leads, not current results. Inspect their contents and relevant source before reuse; independently reproduce on the selected PR revision. Report inability to reproduce under the tested conditions without treating an earlier report as disproved.

## Workspace and execution

Use [PR review builds](builds.md#pr-review-workspace-and-build) in a suitable selected workspace. Product code remains review-only; normal sync/patch preparation has its documented effects and task-local fixtures are separate from a fix. Do not silently repair the PR to obtain a successful demonstration. Diagnostic instrumentation affecting product source needs explicit scope and must be labeled as a modified diagnostic build, not pristine PR behavior.

Choose experiments from source risks and intended behavior, then perform runtime observation with the **pinned PR artifact**, not Nightly. Follow [verification](verify.md), [recipes](recipes.md) and [evidence](evidence.md) for relevant configuration checks, actual triggers and demos. Source and runtime work alternate within the current agent. Inspect failures through source/diagnostics, preserving uncertainty about causes. A build/setup failure is a review coverage blocker, not automatically a product defect.

## Focused fixtures and experiments

Author small task-local extensions, HTML pages, input files or helpers when they isolate a concrete review question. Inspect any downloaded/archive fixture before execution; reuse existing fixtures when useful rather than rebuild them without reason. Explain relevant permissions, dependencies, installation route and mutation effects. Use disposable test data instead of user accounts/transactions for a focused reproduction.

For an extensions change, candidate dimensions can include manifest version, unpacked/packaged loading, permission/API behavior, popup/tab/window actions, disabled/enabled feature state and supported phone/tablet surfaces. Select dimensions from the actual PR/source; these are not universal requirements. Record complete fixture source, exact load/launch steps, expected observations and actual outcomes. Merely authoring a fixture is not proof that it ran.

Retain exact relevant commands/results, crash or other diagnostics and decisive footage for observed failures. Distinguish renderer failure, browser failure and unrelated pre-existing instability when evidence permits. A visible crash alone does not establish its technical cause. [Context export](report-context.md) includes fixture text/source and sanitized receipts, with media and binaries separate. If fixtures need binary inputs, explain how to obtain them without embedding them in the text ZIP.

## Findings and completion

Prioritize material behavioral, reliability, privacy/security or maintainability findings tied to the change. Each finding identifies the problem, impact, source location at the reviewed revision, evidence/reproduction and limits. Label runtime-reproduced, source-only or suspected findings accurately; use a question rather than a confirmed defect when evidence is insufficient. Avoid generic speculative warnings or stylistic noise.

Use [technical-review reporting](reporting.md#technical-review-report), with findings first and build/experiment coverage after. A requested local HTML review/evidence pack includes inspectable captures and text-only context. Publication, product fixes and extra independent replay are separate requests. Keep review status, runtime coverage and report delivery distinct.
