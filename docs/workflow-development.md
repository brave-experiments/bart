# Workflow development

The shared contract helps an agent discover and exercise an Android interaction
route through Clawperator and save instructions for repeating it. It does not
assess product correctness. Executable names, authentication and native output
parsing belong in optional adapters. Only direct execution is implemented; the
file-only task runner is not a device launcher.

## Commands and input

```text
bart workflow-start <prepared-run-directory> <input.json>
bart workflow-step <workflow-directory> <step.json>
bart workflow-finish <workflow-directory> <result.json>
bart validate-workflow <workflow-directory>
```

Start validates preparation, creates a unique directory in its `exploration/`,
and reserves the device in `BART_WORK_DIR/device-controllers/`. The agent must
exclude controllers that do not use BART. Read setup authority before acting;
the helper cannot infer permission from prose.

Input `schemaVersion: 2` has:

- `instructions`: the requested route and its stopping rules.
- `agent: {name, mode}`: actual agent and `direct` or `launched`. Unsupported
  launched execution fails before device work.
- `target: {deviceId, packageId, operatorPackage}` and `authority`: unchanged from
  preparation.
- `budget: {durationMs, actions, observations}`: positive session ceilings, at
  most two hours, 200 actions and 300 observations. Choose bounds for the task.
- `routeChecks`: distinct identifiers for the evidence needed to establish this
  route, for example `["details-screen"]`. Each starts with a lowercase letter
  and contains letters, digits or hyphens.
- Optional `attemptBudget: {total, basis}`: a positive cumulative case ceiling
  and the authority for it. No default attempt count applies to new cases.

Existing case limits must be carried forward. Start records prior counts and
limits in `execution.json` as `attemptHistory`; it rejects omission of a prior
limit. Reservations across every run, including failed and interrupted attempts
and legacy trials, consume the cumulative ceiling. Only explicit authorization
can change that ceiling; `basis` must retain it. The helper records that basis,
but cannot establish that the user granted it. Budgets never expand setup authority.

## Steps and retained evidence

Each step has `kind`, `args` (Clawperator argument array), `reason`, and `evidence`
(relative session paths). Kinds are `observation`, `action`, `attempt`, `capture`.
An attempt is a marker with empty args, used only with an attempt budget; mark it
before actions in that session. Use observation for snapshot/query/read/wait/
screenshot/doctor/version, action for open/click/type/press/back/close/swipe/scroll,
and capture for evidence capture or video start/status/stop. The helper supplies
the target, screenshot destination, capture directory and video session.

Each action references the last successful UI observation receipt, at most two
minutes old. Inspect its contents before choosing targets. Raw stdout, stderr,
timestamps and failures are retained; the helper does not retry. An optional
action `holdMs` (0–60000) prevents subsequent commands and finish until that time
after completion, even after failure. Use it only when the case needs a quiet
observation window; there is no fixed transition timing.

A pending receipt without a final receipt blocks further execution. Inspect
possible effects and finish blocked or incomplete instead of deleting the
reservation or replaying the command. A remaining `step.lock` marks an active or
interrupted helper. Confirm no process or capture remains before manually
releasing that lock, and preserve receipts.

### Transient controls

An action may supply `sequence` with empty `args`: up to six ordered entries,
at most two clicks and three seconds of total delay. A click is
`{"type":"click","x":540,"y":740}`; a delay is
`{"type":"sleep","durationMs":300}`. Each delay is at most two seconds.
The helper sends one Clawperator execution envelope. Each click consumes the
action budget, including reservations in failed sequences. Arbitrary execution
payloads, selectors, paths and target overrides are not accepted.

Use sequences when current evidence establishes every target, such as revealing
transient controls and tapping an observed button. Choose delay from route
evidence, then observe after the sequence. Reacquire after layout changes or
uncertain effects. Never automatically replay a failure: earlier clicks may have
run. Use original screenshot geometry for input coordinates. Host `persistedAt`
is write completion, not the device capture time. Check errors and observation
completeness rather than assuming transport success proves a state.

## Result and readiness

Version 2 results contain:

- `schemaVersion: 2`, `status` (ready, blocked or incomplete), `summary`, and string
  arrays `deviations`, `limits`, `blockers`, `unresolved`.
- `agent` identical to input; `adapters: {direct: "exercised" | "not-run",
  launched: "not-implemented"}`; `productVerdict: "not-assessed"`.
- `observations`: objects with `claim`, `strength` (observed, inferred, unknown)
  and nonempty `evidence` paths.
- `workflow`: a nonempty repeat-instruction file inside session `skills/`;
  `dependencies`: nonempty version/reference strings.
- `checks`: exactly the requested route check keys. Each has `status` (observed
  or unresolved), `detail`, and `evidence` paths. An unresolved check may have no
  evidence; explain what remains unknown.

For example, a check for an app's details screen can be:

```json
{"details-screen":{"status":"observed","detail":"The details screen is visible.","evidence":["receipts/003.json","screens/details.xml"]}}
```

Paths must refer to actual retained files. Every observed check must reference a
successful UI observation receipt; instructions or action receipts alone do not
suffice. Referenced MP4 files also need a complete capture manifest with a matching
artifact hash. Video is optional unless the requested route needs it.

Ready requires all requested checks observed, no blockers or unresolved items,
structured observations, and an exercised successful action followed by a
successful UI observation. Interrupted dispatches prevent ready. Retained failures
do not by themselves prevent readiness when later evidence establishes the route.
The agent must judge whether observations support the claims: the validator
cannot judge pixels or whether a chosen check covers the user's request.

Finish requires stopped capture, retains the result and a SHA-256 manifest of the
session inventory, and releases ownership. Validation checks safe paths, hashes,
preparation identity and result consistency. Evidence and temporary instructions
belong under the run. Keep discovery failures available for later product
assessment. No handoff file, next skill, feature variant or product verdict is
required to establish a usable route.

## Saved version 1 sessions

Version 1 encoded the Brave Core #39794 route. A small read-only validator retains
its original requirements, including its checks, gear receipt, video and handoff.
It does not reinterpret old ready or blocked results as version 2. Sealed evidence
and hashes remain unchanged. New sessions use version 2; step and finish reject
version 1 execution. Close an active old session with its preserved implementation
before starting a new one; do not clear its ownership or rewrite its evidence to
bypass this restriction.

Legacy pending trial receipts still consume the case budget. The legacy ceiling
is two unless its saved explicit authorization revises it. For a continuation,
carry that authorization and total into `attemptBudget`; do not reset counts.
Case-specific controls, timing, feature variants and follow-up checks belong in
the retained case plan and run instructions under `BART_WORK_DIR`. They are not
requirements for other routes. Contract tests use synthetic receipts to establish
validation behavior; they do not establish device behavior or product correctness.
