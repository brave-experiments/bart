---
name: bart-prepare-case
description: Prepare a Brave Android issue reproduction or PR fix verification brief from primary sources, with prerequisites, test steps, evidence requirements, and a preserved first-pass package. Does not execute device tests.
---

# Prepare a BART case

Read BART's AGENTS.md and the general Phase 1 requirements in docs/plan.md.
Use the configured `BART_BRAVE_CORE_DIR` and `BART_WORK_DIR`; validate them with
`./scripts/bart config`. Commands run from the BART repository root. Do not add
machine paths to committed files. Keep reference checkouts unchanged and GitHub
access read-only (`gh api --method GET`, with pagination for lists).

Accept a target URL and objective (`issue-reproduction` or `fix-verification`).
If not specified, use reproduction for an issue and fix verification for a PR;
state this choice. An issue's closure does not change a reproduction request.

## Gather evidence

1. Allocate a new case with `./scripts/bart case-create <unique-id> <url> <objective>`.
   This refuses existing directories. Keep all generated research in its `context/`.
   Do not inspect other case packages or historical summaries during independent
   preparation. Exclude `.context` from searches. Planning examples are not evidence.
2. Read the target, discussion, linked issues, fixing PRs, reviews and relevant QA
   guidance. Preserve retrieved bodies, URLs, retrieval times, and failed attempts.
   Follow links that affect the test, not every incidental reference. Separate
   reports by others from facts established by source inspection. Do not treat
   issue closure, labels, CI success or review approval as runtime proof.
3. Record PR base, head and merge SHAs. Read pinned local objects with
   `git -C "$BART_BRAVE_CORE_DIR" show <sha>:<path>`, never checkout, reset or patch.
   If an object is absent, save the failure and use read-only GitHub retrieval at
   that SHA. Record the current checkout SHA separately. Never silently substitute it.
   Derive Chromium's directory from the checkout parent. Use the revision required
   by the pinned Brave package, recording whether surrounding Chromium source is
   that exact revision or a comparison only. Trace activation, lifecycle, timing,
   settings, flags and dependencies beyond the diff where they affect the test.
4. Inspect related tests. Explain what their assertions cover and what a device
   attempt cannot establish. Issue reports and QA expectations define intended
   behavior; code explains conditions, not correctness. Treat build release comments
   as leads until build provenance is checked. Distinguish compiled defaults from
   rollout state and the effective runtime setting.
5. Stop when the remaining questions require a live build, device, timing, site,
   or account state. Do not install/download binaries, build Brave, operate devices,
   or publish anything as part of preparation.

## Write the package

The preparing agent (Claude Code in the intended BART workflow) authors the research
and test guidance. Load [the package format](references/package-format.md) before
writing. Its schema, finding/check IDs, explicit anchors and descriptive relative
links are required instructions, not naming choices to invent per case. Helpers
only allocate, validate and freeze files. Record who generated the package and the
instruction version; another agent's output must not be labelled Claude-generated.

Use `case.json`, `test-plan.md`, `context/sources.json`, and
`context/source-index.json`, `context/brief-index.json` and
`context/findings.md` plus supporting captures.
Keep runs for later phases under `runs/`; preparation creates no run or verdict.
Use the same sections below, but adapt depth and test strength to the case:

- **Objective and status:** target; reproduction or fix verification;
  `prepared-for-attempt`, never execution-validated.
- **Reported problem and intended behavior:** attribute reports to exact sources.
- **Established source facts:** pin consequential claims to source IDs and SHAs in anchored findings;
  link to them by descriptive title from the plan.
  Include a small revision table and explain historical versus current source.
- **Prerequisites:** build provenance, device/API, settings, navigation mode,
  flags/relaunch, network/account state, and blockers still needing observation.
  For each decisive prerequisite name the proposed observation, whether it is direct
  or inferred, the evidence to retain, and when uncertainty blocks assessment.
  A source-level eligibility condition is not proof of runtime activation.
- **Proposed steps:** numbered human actions; identify source-backed steps and
  exploratory variants. Define resets, a total retry budget including confirmation
  repeats, and stopping rules. Separate calibration from scored attempts; freeze
  observation intervals and capture settings before scoring. If calibration changes,
  start a new labelled series rather than selecting a timing rule from its results.
  Avoid guessed coordinates or treating test-only hooks as user actions.
- **Expected observations and decisions:** distinguish reproduction, scoped fix
  behavior, failure, and insufficient evidence. A missing negative control weakens
  causal claims. Define per-attempt results and preserve mixed outcomes; do not
  replace conflicting trials with a blanket pass. Keep symptom, intended action and
  trigger evidence separate when they can differ. A newer build's non-reproduction
  does not refute an older report.
- **Nearby regressions:** a bounded set with expected observations, not a broad QA suite.
- **Execution evidence:** build/device identity, setup screenshots, before/after
  state, continuous recordings, action timing, attempts including failures, and
  evidence needed to distinguish similar-looking outcomes. Keep evidence links relative.
- **Unknowns and limits:** conflicts, missing assets, inaccessible sources, server
  changes, timing and test coverage gaps. Explain what cannot be concluded.
- **Sources:** links into `context/sources.json` and saved supporting material.

Include a compact check table. Initial required checks define the first attempt;
optional checks remain unrun until selected. Give each check a `check-NNN` ID,
explicit definition anchor, descriptive title link, and a
relative evidence destination (including a distinct recording for each variant):

| Check ID | Prerequisite and observation method | Action | Expected observation | Required evidence | Scope |
| --- | --- | --- | --- | --- | --- |
| [Check title](#check-001) | State and direct/inferred signal; blocking uncertainty | Human action | Per-attempt criterion | Relative evidence path | Initial required / optional |

In `case.json`, retain schemaVersion, caseId, target, objective and createdAt from
creation; add preparedAt, status, and revision identities. `sources.json` is a
nonempty array with unique `id`, `capture` relative to context, `retrievedAt`, and
specific `supports` text per record. Add the source URL (or repository/path and
revision), and symbol, line range or JSON pointer for each consequential claim.
Connect source IDs to `finding-NNN` entries in brief-index.json, and cite the
primary evidence in findings.md. Link finding titles from the plan. Inventory-only
records may describe their limited role; do not claim they prove runtime behavior.

`source-index.json` contains `retrievedAt` and a `files` array for pinned source
reads. Each captured file has `role`, `repository`, full 40-character commit
`revision`, repository-relative `path`, and `capture` relative to context. Failed
reads retain `role`, requested `revision`, `path`, and `error`, without a `capture`.
An empty files array is allowed when no source file could be captured; explain that
coverage limit. Preserve raw API captures and failed attempts rather than only
summaries. Linked media not watched is not visual evidence; say so.

## Check and preserve

Read the completed brief as a fresh execution agent: can it explain the test,
identify missing prerequisites, and recognize success, failure or insufficient
evidence without this conversation? Check source links against saved API IDs;
verify pinned Git objects, file paths and relevant symbols. Record checks and
failures in `context/preparation-checks.md`. Tool checks do not prove the brief true.

Stop capture writers before freezing; this helper detects changes across its
checks but does not lock out other processes. Set status to `prepared-for-attempt`,
then run `./scripts/bart case-freeze <id>`.
It copies only case metadata, plan and context into `first-pass/`, with SHA-256
hashes in `manifest.json`. It validates the package format, finding/check anchors and links, source-index
shape and capture references,
compares source and copied file sets and bytes, and rejects observed additions,
removals or edits before writing the manifest. These checks do not validate research
claims. It refuses to overwrite an existing snapshot. A failed
freeze without a manifest is incomplete; preserve it and use a new case ID rather
than overwriting it. Do not modify a completed first-pass directory. The manifest
is tamper-evident, not filesystem-enforced immutability. Later comparison or edits
must be separate and need their own authorization. For an authorized revision,
allocate a new case ID; record the superseded case ID, frozen manifest hash and
relative path in `case.json`. Put comparison findings in the new context, identify
them as comparison-derived, and preserve the original first-pass bytes. Report package and snapshot
locations, checks, unresolved prerequisites and lessons. Stop before execution.
