# BART implementation plan

Status: Phase 0 is implemented. Phase 1 and later phases remain unimplemented.

## Goal

BART (Brave Automated Runtime Tester) will investigate reported Android issues and verify fixes through observed device behavior. The [north star](north-star.md) defines the intended result. The eventual entry point is `bart-verify`, an orchestrator skill supporting both requests:

```text
Run bart-verify on issue https://github.com/brave/brave-browser/issues/57449
to determine whether the reported behavior can be reproduced.

Run bart-verify on PR https://github.com/brave/brave-core/pull/39794
to verify its fix for issue #57449.
```

Failure to reproduce does not establish that an issue is invalid. Reports must state the tested conditions and distinguish reproduction, expected behavior, causal attribution, and missing evidence.

Claude Code directs and assesses device workflows. Clawperator provides Android actions, observations, screenshots, and recordings.

## Implementation approach

Use Node.js and TypeScript: one package, a small `bart` CLI, and Markdown skills. Choose a Node version compatible with the pinned Clawperator version. Prefer Clawperator's Node API where suitable; use its CLI when needed through a small integration module. No service, database, or general adapter framework is needed for the prototype.

Code manages files, subprocesses, deadlines, run state, evidence capture, and result validation. Claude chooses actions from current observations and judges behavior. Runtime validation remains necessary for agent output and other external data.

Implement the phases in order for one case, #39794. Each phase must produce usable inputs for the next phase before proceeding. Define its input, output, and completion condition first. Improve earlier phases when live work reveals missing information. Do not generalize each phase before trying the next one.

Define the minimum report and evidence requirements early, even though the report skill comes later. Add substates only when actual retries, interruptions, or handoffs need them. Proposed phase skill names below may change as their boundaries become clearer.

## Phase 0: prepare the repository

Set up the TypeScript package and basic development commands, select compatible dependencies, and document how to start work. Add a committed `.envrc.example` and ignore the local `.envrc`. Follow Bravebot's simple environment-variable convention.

Keep the single Node.js package in `node/`, including its manifests, TypeScript
configuration, source, tests, dependencies, and build output. Keep `.nvmrc`, local
configuration, docs, and `scripts/bart` at the repository root. The launcher must
resolve paths from its own location. Work-directory validation must protect the
whole BART repository, not just `node/`. Do not add a workspace framework.

Add `./scripts/bart doctor` through a thin launcher for the Node.js/TypeScript
CLI. Check the declared Node version requirement, reference checkout, work
directory (explicitly configured), and availability and versions of Clawperator,
GitHub CLI, and Claude Code. Print clear results and fixes; exit nonzero when a
required check fails. Limit checks to the host. Tool availability does not prove
authentication, device readiness, or working agent integration. Do not install
tools, edit configuration, or operate a device. Future commands remain deferred.

Use two path variables:

| Variable | Meaning | Initial policy |
| --- | --- | --- |
| `BART_BRAVE_CORE_DIR` | Reference Brave Core checkout | Required absolute path; validate the repository identity. |
| `BART_WORK_DIR` | Local context, runs, downloads, and evidence | Required absolute path; no default. |

Set the reference checkout path in local configuration; use a placeholder in `.envrc.example`. Derive Chromium's source directory from the checkout's parent when needed. Read pinned Git objects without changing the checkout's branch or working state.

Set both path variables explicitly; reject missing, empty, or whitespace-only values. Use placeholders for both paths in `.envrc.example`.

Load configuration with `direnv` or source the local `.envrc` before starting the agent. Pass resolved paths explicitly to child Claude processes. Do not add a second configuration format or checkout discovery yet.

Use this working layout:

```text
$BART_WORK_DIR/
  cache/apks/
  cases/
    brave-core-pr-39794/
      context/
      test-plan.md
      runs/
        <timestamp>-<id>/
          run.json
          skills/
          exploration/
          verification/
          report.md
    brave-browser-issue-57449/
      context/
      test-plan.md
      runs/
        <timestamp>-<id>/
          ...
```

Keep runs under their cases and binaries in a shared cache. Related issue and PR cases can reference each other. Each invocation gets a unique run directory. Record the exact context and plan used through retained snapshots or immutable revisions with hashes, so later case edits cannot change an earlier result's meaning.

Keep run evidence links relative for portability. Retain temporary skills with their run. Do not add automatic cleanup initially. Keep generated working files out of Git and preserve the historical handoff as research rather than importing it wholesale as implementation.

Completion: the package's basic checks and host doctor work, configuration is documented and validated, and working paths can be resolved without changing a device or reference checkout. Phase 0 establishes shared path/configuration support; later phases create their actual outputs.

## Phase 1: understand and plan

Proposed skill: `bart-prepare-case`.

Input: an issue or PR URL, the reference checkout, and the requested objective.

Use `gh` read-only to inspect linked issues, PRs, discussion, and QA notes. Inspect relevant Brave Core and Chromium source at identified revisions. Follow code beyond the diff when it changes activation, timing, or expected behavior. Gather enough information to define and interpret a meaningful test; stop when remaining questions require runtime observation.

Produce a concise human-readable brief and test plan with supporting sources:

- Reported behavior and intended behavior.
- Numbered reproduction steps, where the evidence supports them.
- Preconditions, flags, settings, device constraints, and build requirements.
- Expected observations, failure conditions, and nearby regression checks.
- Unknowns, conflicting reports, and live discovery requirements.
- Source links, pinned revisions, and a small amount of machine-readable identity metadata.

The issue and QA requirements establish desired behavior. Code explains the mechanism and its conditions; implementation behavior alone does not define correctness. Prepared context supplies expectations, never live observations or a verdict.

Completion: a fresh agent can understand and attempt the scoped case from the saved package without the original conversation. Begin with #39794 using the existing handoff research.

## Phase 2: prepare the run

Proposed skill: `bart-prepare-run`.

Input: the case package, build requirements, designated target/package, and permitted setup actions.

Reuse the existing APK-selection mechanism once its actual entry point is located. Download or accept an appropriate binary, record its source relationship and provenance, and verify installation and active package identity. A containing release supports retrospective verification; it does not establish exact PR-head testing.

Create the run record. Check device and Operator readiness, Claude integration, capture tooling, installed Brave/Chromium versions, and applicable settings. Recheck flags after relaunch. Record reset authority when a reset is needed; do not make a clean reset the default for cases that depend on retained state.

Completion: the record identifies the actual build, target, relevant starting conditions, and readiness or specific blockers. Keep this separate from reusable case context because device state changes between runs.

## Phase 3: develop the agent-driven workflow

Proposed skill: `bart-develop-workflow`.

Input: the case plan and prepared run.

Claude explores through Clawperator, resolves current navigation and control locations, and develops a temporary agent-driven skill. Use the [com.android.settings.get-version-details-codex example](https://github.com/clawperator/clawperator-skills/blob/76bad61b5915e70dd53f38111eaf932c5ff92706/skills/com.android.settings.get-version-details-codex/SKILL.md) as a design reference, replacing programmatic `codex` invocation with programmatic `claude` invocation.

A thin launcher supplies instructions, target, run directory, and a bounded budget. Claude chooses actions from fresh observations. Helpers execute actions and retain evidence. The skill returns a structured result tied to evidence, which the launcher validates. Only one agent controls the target at a time.

Record preconditions, a suggested route, checks, observation points, and capture boundaries. Ground actions in current UI observations rather than treating historical coordinates or successful command exits as proof. Keep discovery logs and exploratory recordings under `exploration/`.

Completion: the temporary skill can execute the scoped workflow and report deviations truthfully. Preserve the skill and its dependencies or version references with the run so later review can establish what executed.

## Phase 4: record verification runs

Proposed skill: `bart-run-verification`.

Input: the prepared workflow, selected checks, and current precondition observations.

Perform fresh, assessed attempts with concise videos intended for reviewers. Exploration is retained separately. Capture starts before the behavior being judged and continues through its result. Lengthy setup can stay outside the main clips, with supporting evidence linked from the run.

For #39794, produce two clearly named captures:

- `kBraveYoutubeFullscreenSettingsWorkaround - Disabled`
- `kBraveYoutubeFullscreenSettingsWorkaround - Enabled`

Each shows fullscreen entry, the gear action, and the observed result. Back the variant label with a flag check after relaunch. The enabled expectation is native fullscreen exit followed by settings opening. Check harmless option selection separately. Do not manually exit fullscreen or open settings to rescue the transition being assessed.

The first scope is Y1 Disabled, Y2 Enabled, and one harmless option-usability check. Mark the remaining Y3 repeated-entry and Y4 non-fullscreen checks `not_run`; full-case coverage remains incomplete.

Inspect screenshots and decisive video visibility, including rotation and cropping. Retain action receipts and observation timing. Trimming irrelevant lead-in or trailing footage is acceptable; preserve original recordings and do not cut away the decisive transition, relevant waits, or interventions.

Completion: a reviewer can follow each assessed attempt from starting state through action and outcome using the named videos and supporting observations. A well-observed product failure can satisfy this phase. Missing decisive footage makes evidence incomplete. A later clean recording does not erase a valid earlier failure.

## Phase 5: assess and report

Proposed skill: `bart-report`.

Input: case expectations, run identity, attempts, observations, and finalized evidence.

Generate a local Markdown report with the objective, device/OS, Brave/Chromium versions, build/source relationship, steps, expected and actual results, and prominent video links. Link screenshots and detailed records where useful. Include failed attempts, conflicting outcomes, omitted checks, and evidence limitations.

Use per-check outcomes such as `pass`, `fail`, `blocked`, `inconclusive`, and `not_run`. For reproduction, state whether the reported behavior was reproduced under the tested conditions. Keep behavior, causal attribution, evidence completeness, and phase execution status separate. For example, both YouTube variants working may establish enabled behavior while leaving attribution inconclusive.

Code can validate artifact existence, integrity, and result structure. Those checks do not prove a visual or behavioral conclusion; Claude must assess the observations. Report regeneration must use saved evidence without rerunning device actions.

Completion: the report's conclusions follow from inspectable evidence and match its stated scope. Use Brave QA's device/build, steps, actual-results, and screenshot/screencast conventions. GitHub publication is deferred.

## Later: compose `bart-verify`

After the first complete run, prove fresh-session reuse and try a contrasting case before adding the orchestrator. The scrim case (#39665) tests visual judgment. The new-tab race (#57997, fixed by #39462) tests timing limits and honest uncertainty; successful ordinary taps do not prove that the internal race window was exercised.

Use Clawperator's release orchestrator as a coordination reference: establish identity, preserve each phase's checks, pass explicit outputs forward, and resume from the appropriate incomplete phase. Re-observe mutable device state on resume. An interrupted transition needs a new attempt.

Unlike a release workflow, a product failure must proceed to assessment and reporting. Setup blockers also receive a diagnostic report. Never infer completion from an agent exit code alone.

Initially coordinate prepared cases. Broader context automation, exact open-PR artifact verification, and external delivery can follow as separate capabilities. GitHub posting and labels require a later authorized delivery path; the initial GitHub integration stays read-only. Retrying publication must not rerun device actions or change the QA verdict.

## Future GitHub entry point

Assigning an issue to a `brave-bart` account or applying a `bart` label could
request verification. These are future requirements, outside Phase 0:

- Manual and GitHub-triggered requests use the same verification workflow.
- Execution accepts explicit inputs and returns structured results without
  requiring an interactive conversation.
- GitHub discovery stays separate from verification.
- Track request identity and tested revision so repeated polling does not
  automatically repeat completed work. Provide an explicit rerun mechanism.
- Only one controller operates a device at a time.
- Report publication can retry without repeating device actions.

Phase 0 does not implement polling, webhooks, queues, bot-account setup, or
publication.

## References and current gaps

- Historical research: `.context/bart-handoff-2026-09-21/START-HERE.md` and its linked guide. This plan records the subsequent agreed implementation sequence.
- Orchestrator reference: `.agents/skills/release-orchestrator/SKILL.md` in the Clawperator repository.
- Agent-driven skill reference: [com.android.settings.get-version-details-codex in clawperator-skills](https://github.com/clawperator/clawperator-skills/tree/76bad61b5915e70dd53f38111eaf932c5ff92706/skills/com.android.settings.get-version-details-codex), pinned to commit `76bad61b5915e70dd53f38111eaf932c5ff92706`.
- Environment convention: `.envrc.example` in the Bravebot repository.
- QA references: the `qa-resources` repository and its `qa-resources.wiki` checkout.

Before live work, locate the existing APK-selection entry point, designate the target/package, establish binary provenance and setup authority, and prove Claude/Clawperator integration and recording readiness. The historical helpers and prepared case packages are reusable material, not evidence that the new workflow already works.
