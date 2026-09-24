# Case preparation

The [bart-prepare-case skill](../skills/bart-prepare-case/SKILL.md) gathers primary
sources and writes a brief for a later execution agent. The repository's
`.claude/skills/bart-prepare-case` link makes it available to Claude Code. Other
agents can load the canonical skill directly. It does not implement `bart-verify`,
prepare binaries, operate devices, or post to GitHub.

Use [run preparation](run-preparation.md) to consume a frozen package and retain
build identity, device observations and readiness for Phase 3.

The CLI adds case allocation and first-pass preservation using Phase 0's validated
configuration. Research and judgments remain in the skill. Each case has identity
metadata, a human-readable plan, saved primary sources, and a source index. A
freeze copies those files and records SHA-256 hashes. It excludes future runs and
refuses an existing snapshot. It checks file integrity, not research quality.

## Prepare and freeze a case

Load the skill and supply an issue or PR URL and the testing objective. Use
`issue-reproduction` for an issue or `fix-verification` for a PR. After
[development setup](development.md), run these helpers from the repository root
as directed by the skill:

```sh
./scripts/bart case-create <unique-id> <url> issue-reproduction
# Gather sources and write the package using the skill, then:
./scripts/bart case-freeze <unique-id>
```

Both commands reject a symlinked `cases` directory to keep writes under
`BART_WORK_DIR`. Creation refuses an existing case ID. Freezing requires
`case.json` marked `prepared-for-attempt` with schemaVersion 2, `test-plan.md`,
`context/findings.md`, `context/brief-index.json`, `context/sources.json`, and
`context/source-index.json`. It copies the package into `first-pass/` and records
SHA-256 hashes in `manifest.json`, excluding runs. No automatic cleanup or
historical comparison runs.

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

## Validation and preservation

Freezing checks source indexes, capture paths, finding/check anchors and descriptive
links before copying. It compares source and copied file sets and hashes before
writing the completion manifest. An observed change causes rejection; a partial
copy remains without a completion manifest. Stop capture writers before freezing:
the helper does not lock other processes.

Keep frozen packages unchanged. Store investigation notes, preparation results,
failed attempts and snapshot identities under `BART_WORK_DIR`, with execution
evidence inside its case/run directory. None of these records establishes device
behavior without a later execution attempt.

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
