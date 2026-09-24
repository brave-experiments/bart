# Run preparation

Phase 2 consumes a frozen `first-pass` case and explicit preparation observations.
The [bart-prepare-run skill](../skills/bart-prepare-run/SKILL.md) gathers those
observations. `bart prepare-run <case-id> <input.json>` preserves and validates
them. It never installs software, changes device state, or invokes a model.
Missing inputs produce a blocked record, not a product verdict.

## Input contract (version 1)

All fields below are required unless marked optional. Unknown scalar values use
`null`; unknown checks use `unknown` with a reason and next action. Paths in the
input are absolute. The CLI copies evidence into the run and rewrites links.

- `schemaVersion`: `1`.
- `target`: `{ deviceId, packageId, operatorPackage }`, each string or null.
- `authority`: `{ allowedActions: string[], reset: "not-authorized" | "authorized",
  basis: string }`. Describe who authorized setup and its limits.
- `build`: null, or `{ path, origin, relationship, sourceRevision, evidence }`.
  `path` is a local APK. `origin` describes its source. `relationship` is
  `exact-pr-head`, `containing-release`, or `unresolved`; `sourceRevision` is a
  full Git SHA or null. `evidence` is an array of absolute receipt paths.
  Optional `expectedSha256` checks a publisher's digest. A digest alone does
  not establish source provenance. Resolved relationships require receipts and
  a source revision; the skill must assess those receipts.
- `checks`: object keyed by the check IDs below. Missing checks become unknown.
  Each supplied check has `{ status, observedAt, method, detail, nextAction,
  evidence }`. Status is `pass`, `fail`, or `unknown`; `observedAt` is an ISO
  timestamp or null. `method` and `detail` explain the observation and its limits.
  `nextAction` is required nonempty text for fail/unknown, null for pass.
  `evidence` lists absolute files. Pass requires a timestamp and evidence.
- `observations`: `{ androidVersion, braveVersion, chromiumVersion,
  activePackage, settingsVariant, settings, performedActions }`. The first four
  are strings or null; `settingsVariant` is `disabled`, `enabled`, or null.
  `settings` and `performedActions` are arrays of strings describing observed
  values and setup actions, with timing and receipt references in checks.

Required checks are `build-provenance`, `device`, `operator`, `agent-integration`,
`recording`, `installed-package`, `active-package`, `starting-conditions`, and
`case-prerequisites`. The preparing agent assesses evidence; the CLI validates
structure and integrity, not the truth of screenshots or prose.

For #39794, starting conditions must identify one current settings variant,
video-fit Enabled, study assignments and flag checks after relaunch. Disabled
and Enabled are successive conditions, never simultaneous starting conditions.
Case prerequisites cover the frozen plan's remaining setup requirements. An
integration pass requires a retained Claude invocation/profile and successful
Clawperator observation from that child. A version command, doctor model reply,
or the file-only task runner cannot substitute for this check. Recording pass
requires a finalized, decoded and visually inspected calibration clip, including
rotation, without assessing the product behavior reserved for later phases.

For Claude 2.1.267, use `--bare --restricted --disable-slash-commands
--strict-mcp-config` with an explicit Clawperator MCP configuration for this
probe. Use `--tools "" --allowedTools mcp__clawperator__snapshot
--permission-mode dontAsk` to permit only the snapshot call, and pass the device
and Operator package explicitly in that call. `--safe-mode` disables even
explicit MCP servers in this version. Retain native tool results and check the
device observation; a successful process exit can still contain no tool call.

Clawperator 0.12.2 recording requires scrcpy 3.0 or newer, ffprobe, and FFmpeg
6.1 or newer with a working libx264 encoder. Check the encoder capability probe
before capture. Record the selected tool versions and retain failed clips.
Decode success does not prove usable capture. Inspect both rotation transitions
and the final hold; black frames or a missing return to portrait block readiness
even when the capture manifest says `complete`. Rotation retains the initial
canvas and can show sideways content. Inspect every video artifact listed in
the manifest; a display-size change can produce more than one clip.

## Saved output (version 1)

Each invocation creates `cases/<case-id>/runs/<timestamp>-<uuid>/` containing:

```text
run.json
preparation.md
preparation/input.json
preparation/package/manifest.json
preparation/package/case.json
preparation/package/test-plan.md
preparation/package/context/...
preparation/evidence/<number>-<filename>
```

`run.json` has `schemaVersion: 1`, `kind: "run-preparation"`, `runId`, `caseId`,
`createdAt`, `completedAt`, `objective`, `caseTarget`, `inputSha256`, `package` (snapshot path
and manifest SHA-256), the input's `target`, `authority`, `observations` and
normalized `checks`, `build`, `evidence` (relative path to SHA-256 map),
`status` (`ready` or `blocked`), `blockers`, `unknowns`, and `handoff`.
The build adds `sha256` and a content-addressed artifact location under
`BART_WORK_DIR/cache/apks`; evidence references remain relative to the run.
Input paths are retained only as provenance in the input receipt.

`blockers` and `unknowns` name checks and their next actions. `handoff` points
to the saved plan and lists mutable checks to repeat before execution. Frozen
package hashes and cached binary hashes describe stable bytes. Every device,
Operator, integration, capture and starting-condition observation is historical
and must be rechecked when resuming. There is no product-result field.

`bart validate-run <run-directory>` checks the full record, retained hashes and
package manifest, and rejects readiness inconsistent with missing identity or
unresolved checks. It validates blocked records too. `prepare-run` exits 1 for
a saved blocked run and 0 for ready; malformed inputs fail before allocation.
Interrupted writes never count as a ready preparation.

Completion means a fresh agent can read `preparation.md`, inspect the saved
plan and evidence, and either start Phase 3 after fresh checks or follow the
listed blocker actions. It does not mean a device attempt or product pass.
