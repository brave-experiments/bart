# Workflow development

Phase 3 uses a shared direct-execution contract. It keeps agent executable names,
authentication and native output parsing outside the contract. No launched
adapter is implemented. The existing file-only task runner is not a device
launcher.

## Commands

```text
bart workflow-start <prepared-run-directory> <input.json>
bart workflow-step <workflow-directory> <step.json>
bart workflow-finish <workflow-directory> <result.json>
bart validate-workflow <workflow-directory>
```

Start validates the Phase 2 record and creates a unique directory under its
`exploration/`. It reserves the target in `BART_WORK_DIR/device-controllers/`.
Only cooperating BART sessions respect this reservation; the executing agent
must exclude other controllers. The helper does not make authority decisions
from prose. Read the saved authority before each setup action.

Input version 1 has `instructions` (text), `agent: {name, mode}` (direct or
launched), the prepared `target: {deviceId, packageId, operatorPackage}` and
`authority` unchanged, and `budget: {durationMs, actions, observations,
calibrationTrials}`. Limits are two hours, 200 actions, 300 observations and two
calibration trials. A launched mode fails explicitly before device work.
Choose smaller bounds for the actual task. Budgets are ceilings, not permission
to perform actions outside the frozen plan. The helper counts trial reservations across all runs of the case, including
interrupted ones, so restarting a session does not reset the authorized cumulative ceiling.

Each step has `kind`, `args` (Clawperator argument array), `reason`, and `evidence`
(relative file paths within the workflow directory). Kinds are `observation`,
`action`, `trial`, `gear`, and `capture`. Trial is a marker with empty args. Gear
must be a click and consumes the trial's one tap even if execution fails. Use
observation for snapshot/query/read/wait/screenshot/doctor/version; action for
open/click/type/press/back/close/swipe/scroll; capture for evidence capture or
video start/status/stop. The helper supplies the target, screenshot destination,
capture directory and video session. Each action requires the last successful
observation receipt, at most two minutes old. Inspect its content before acting.
The helper retains raw stdout, stderr, timestamps and failures; it does not retry.

A gear receipt blocks further commands for at least 13 seconds after completion,
which conservatively retains the fixed 10-second window plus final hold. Record
the actual dispatch interval and judge video timing from the original. A pending
receipt without its final receipt blocks further execution; inspect effects and
finish with a blocker instead of deleting the pending record or replaying it.
A remaining `step.lock` marks an active or interrupted helper. Confirm no process
or capture remains before manually releasing that lock; preserve its receipt.

## Result

Version 1 contains:

- `status`: ready, blocked or incomplete; `summary`; string arrays `deviations`,
  `limits`, `blockers`.
- `agent`: identical to the input; `adapters: {direct: "exercised" | "not-run",
  launched: "not-implemented"}`; `productVerdict: "not-assessed"`.
- `observations`: objects with `claim`, `strength` (observed, inferred, unknown)
  and nonempty `evidence` paths.
- `workflow` and `handoff`: relative paths to retained documents;
  `dependencies`: nonempty version/reference strings.
- For ready only, `checks` keyed by preconditions, actions, nativeFullscreen,
  landscapeControls, gearTarget and captureTransition. Each needs
  `status: "observed"`, `detail`, and nonempty evidence paths. Ready also requires
  an exercised gear action and observation and no blockers.

Finish retains the result and a SHA-256 manifest of all session files and releases
ownership. Stop capture before finishing so background writers cannot change
sealed evidence. Validation checks the complete file inventory, hashes, safe
relative paths, preparation identity and structured result. These checks establish
integrity and consistency, not truth of visual conclusions. Missing live coverage
must remain blocked or incomplete. Evidence, temporary skills and session reports
belong under the run, not in durable documentation.

## Transient controls

An action may supply `sequence` with empty `args`: up to six ordered entries,
at most two clicks and three seconds of total delay. A click is
`{"type":"click","x":540,"y":740}`; a delay is
`{"type":"sleep","durationMs":300}`. Each delay is at most two seconds.
The helper sends one Clawperator execution envelope. Each click consumes the
normal action budget, including clicks reserved in a failed sequence. Arbitrary
Clawperator payloads, selectors, paths and package overrides are not accepted.

Use a sequence only when current evidence establishes the layout and all targets.
For example, reveal hidden video controls, wait 300 ms, then tap the fullscreen
icon observed in that same layout. The delay is a tested starting value, not a
promise about every player. Take the next observation after the sequence;
reacquire targets after rotation, navigation or uncertain effects. Never replay
a failed sequence automatically: earlier actions may already have run. A `gear`
sequence ends with the single gear tap; any earlier click only reveals controls.
The same 13-second hold applies after the sequence completes.

Two calibration trials remain the default cumulative case ceiling. An explicit
user revision may supply `calibrationAuthorization: {totalTrials, basis}`.
`totalTrials` is the revised cumulative ceiling (3 to 10), not an added allowance;
`basis` records the user's authorization and scope. The per-session ceiling stays
two. Preserve the old plan and receipts, record the revision in the handoff, and
never infer renewal merely from a retry or a new session.

Clawperator 0.12.4 returns original screenshot dimensions and coordinate origin.
Use those dimensions when converting a resized preview to input coordinates.
`persistedAt` is the host write-completion time, not the capture instant.
Text-entry and submission acknowledgments need a destination observation before
claiming navigation. Full snapshot transport now checks correlated chunk bytes
and hashes; still inspect errors and completeness rather than assuming success.
