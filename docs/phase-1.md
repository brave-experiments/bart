# Phase 1: prepare a case

The [bart-prepare-case skill](../skills/bart-prepare-case/SKILL.md) gathers primary
sources and writes a brief for a later execution agent. The repository's
`.claude/skills/bart-prepare-case` link makes it available to Claude Code. Other
agents can load the canonical skill directly. It does not implement `bart-verify`,
prepare binaries, operate devices, or post to GitHub.

The CLI adds case allocation and first-pass preservation using Phase 0's validated
configuration. Research and judgments remain in the skill. Each case has identity
metadata, a human-readable plan, saved primary sources, and a source index. A
freeze copies those files and records SHA-256 hashes. It excludes future runs and
refuses an existing snapshot. It checks file integrity, not research quality.

The three initial preparations use separate case IDs and source captures under
`BART_WORK_DIR/cases/`. Their suffix is `first-pass-20260921`; the targets are
`brave-core-pull-39794`, `brave-core-pull-39665`, and
`brave-browser-issue-57997`. Each frozen package lives in its case's `first-pass/`.
They are prepared for an attempt, not validated through execution. Historical
research was excluded and no comparison was performed.

## Lessons from preparation

- Separate desired behavior in reports from the mechanism in source. A workaround
  can restore access while changing the visible transition.
- Record compiled defaults, rollout proposals and runtime flag state separately.
  A release comment does not establish the installed binary's revision or activation.
- Visual checks need explicit setup and evidence that the target state remains
  active. A dismissed keyboard can also dismiss focus and invalidate a screenshot.
- A regression test can prove a specific internal timing condition without giving
  a repeatable human gesture. Mark exploratory timing steps and limit retries.
- Issue reproduction can remain worthwhile after a fix merges. Record whether the
  chosen build predates the fix and avoid treating non-reproduction as disproof.
- Preserve source failures and distinguish exact historical Chromium revisions
  from the current checkout. Read Git objects without switching branches.

These lessons changed the common skill's guidance. Case-specific conditions and
conclusions stay in generated packages. Later historical comparison and device
attempts are separate work.

## Initial snapshot identities

These hashes identify each frozen `manifest.json`; each manifest lists the hashes
of its case metadata, plan and source captures. Generated material remains outside
Git under `BART_WORK_DIR`.

| Target | Frozen files | Manifest SHA-256 |
| --- | ---: | --- |
| brave-core PR 39794 | 36 | `9401d9f284f1f8ce516486b8c0aa352ac7895b477e5f529b28260d08d1768de5` |
| brave-core PR 39665 | 30 | `898373d9d665a1ba60eeccbfeedc989c254894902381fde5c55036d47f86210b` |
| brave-browser issue 57997 | 25 | `f51e01719889c751eb595555a7a3697035b6c0b5b49f229b54272f7dce6b0868` |

Validation checked 38 pinned source captures against local Git objects, source
paths and commit identities, package links, and every frozen file hash. Skill
validation, TypeScript checks, 17 Node tests and the build passed. One intermediate
test run failed after file validation moved before metadata parsing: the test
expected a draft-status error before supplying a plan. The corrected test checks
both missing-file rejection and draft-status rejection. No runtime claims were
validated.

## Review follow-up

The initial freeze could copy a newly added capture without including it in the
manifest. A deterministic regression test reproduced that interleaving before the
fix. Freezing now hashes the initial source set, enumerates the actual destination,
compares both sets and contents, and checks again for source and destination changes
before writing the manifest. Added, removed or edited files cause rejection; a
partial copy remains without a completion manifest. Capture writers must stop before
freezing because these checks do not lock other processes.

Package validation now checks the source-index shape, full revisions for captured
source, unique source IDs, timestamps and references to regular files within context.
Failed source reads remain valid records without a capture. These checks establish
local structure, not research accuracy. The skill also requires check IDs, initial
scope, evidence paths, observation methods, explicit attempt budgets and per-attempt
outcomes. Type checks, 31 tests, the build and skill validation passed after this fix.

## Revised preparation packages

The focused review revisions use suffix `review-20260921` under
`BART_WORK_DIR/cases/`, with the same three target prefixes as the initial cases.
Each new case records the original case ID, relative snapshot location and manifest
hash in `case.json`. Its `first-pass/` directory freezes the revised case; it is not
an independent first-pass result and does not replace the original snapshot.

The revisions apply the supplied comparison findings without reading `.context`
or repeating historical research. They add 41 specific claim records with verified
source symbols/lines or API pointers, check tables, direct/inferred observation
methods, initial scope and bounded attempts. YouTube's initial assessed scope is
the Disabled/Enabled pair and option check, with rotation/capture calibration before
scoring. Scrim checks identify each layout and do not equate API/navigation eligibility
with observed rendering. The new-tab case counts confirmation within ten main
attempts and separates tab creation, unintended input and race-trigger evidence.

| Revised target | Frozen files | Manifest SHA-256 |
| --- | ---: | --- |
| brave-core PR 39794 | 40 | `5c8aff0d0918e7015ba31c5320addc38250dc0d7533a8c714819d3a389ca4976` |
| brave-core PR 39665 | 34 | `eec69fba98ebb1fcde8a90412b8510f83eef373c6b41c667d1098a4be7a56010` |
| brave-browser issue 57997 | 29 | `f7620422fd762bbb742f0de6246bf361f5fe8d0d7ff6029009226eafb92531cf` |

Checks verified all 41 claim locators, 38 pinned source captures, complete manifest
coverage and hashes for all 103 revised frozen files, and the unchanged original
91 files and manifest identities. The corrected helper validated the revised source
indexes and capture paths before freezing. No device behavior was validated. Build
provisioning and runtime observation remain later-phase work; the supplied review's
1.97.28 candidate is retained as a lead, not as established APK identity.

## Agent-authored findings and navigation

New packages use schemaVersion 2 and the shared
[package format](../skills/bart-prepare-case/references/package-format.md).
The preparing agent writes `context/findings.md`, `test-plan.md` and
`context/brief-index.json`. Claude Code is the intended caller; TypeScript does
not write the findings. The skill requires explicit `finding-NNN` and `check-NNN`
anchors and descriptive relative links, replacing ad hoc case prefixes.

Freezing checks the index, source IDs, anchors and link labels. These checks do
not establish the truth of a finding. Release-version leads and feature gates
are content requirements in the shared instructions. A release lead still needs
an available artifact and runtime activation still needs observation.

Legacy frozen packages remain unchanged. To update a schemaVersion 1 package,
create a new revision case and record its predecessor; the freeze command now
requires schemaVersion 2. Record the actual preparing agent and instruction
identity so that output authorship can be checked.

A fresh Claude Code generation attempt on 2026-09-21 stopped before any model
work because the CLI was not logged in. Three `format-20260921` revision drafts
and the prompt, instruction copies and error receipt remain under `BART_WORK_DIR`.
They are not frozen outputs or evidence that Claude followed the format. The
existing snapshots remain the usable preparations until regeneration can finish.
