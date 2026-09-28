---
name: bart-develop-workflow
description: Discover and exercise a bounded Android interaction route through Clawperator from a prepared BART run, retaining repeat instructions, failures, evidence and unresolved checks without scoring product behavior.
---

# Develop a workflow

Read the prepared run, retained case plan and context, and
[execution contract](../../docs/workflow-development.md). Validate preparation
with `bart validate-run`. Device observations are historical: recheck the device,
installed build, foreground package and starting conditions relevant to this
route. Create a new preparation when those conditions or setup authority change.
Preserve previous preparations and failures. For Brave/Chromium work, consult
[the orientation skill](../../.agents/skills/brave-clawperator-orientation/SKILL.md).

Execute with the available tools and record the actual agent and mode. The helper
supports direct execution only; a launcher without an adapter is a blocker.
Do not substitute the file-only task runner for device work.

Start with explicit instructions, target, preparation authority, session budgets
and a short list of requested `routeChecks`. Derive checks from the case, not from
a previous workflow's UI. Carry forward any case attempt limit and its authority
with `attemptBudget`; include consumed attempts from earlier sessions. A new
session or contract version does not renew permission. Only one controller may
operate the device. BART reserves it across cooperating sessions; coordinate
other tools and people separately. Never clear a lock merely because a process
exited: inspect pending commands and capture first.

1. Select the pinned Clawperator CLI, explicit device and compatible Operator.
   Require doctor exit zero and `criticalOk: true`. Discover runtime skills by
   package and inspect their goal coverage. Prove action and observation access.
2. Observe current UI. Inspect the retained hierarchy and screenshots where
   needed for foreground, overlays, completeness and target bounds. Reference
   the current observation when choosing each action. Reacquire after transitions
   or uncertain effects. For transient controls, use a bounded sequence when
   current evidence establishes all targets; avoid a screenshot round trip
   between taps. An exit code alone does not prove the intended state.
3. Retain commands, timestamps, failures and original captures in the session's
   `exploration/` directory. A malformed observation permits one bounded read-only
   recovery; never replay the preceding mutation. Stop if recovery fails.
4. When the case limits attempts, mark each attempt before its route. Follow the
   case's stopping rules and observation windows. Use action `holdMs` for a
   required quiet interval. Capture video when the route needs transition or
   timing evidence; inspect finalized originals and decisive frames. Other routes
   may need only retained UI observations. No particular control, orientation,
   feature variant or capture format is required for every workflow.
5. Stop for exhausted budgets, loss of target identity or required starting
   conditions, or evidence too weak to continue safely. Preserve partial evidence
   and report unresolved steps. Do not reset app/account data outside explicit
   preparation authority. Never replay a failed sequence automatically.
6. Save `skills/SKILL.md` inside the session with preconditions, the observed route,
   selectors and refresh rules, checks, observation points, any capture boundaries
   and timing, stopping rules, dependencies and version references. Clearly mark
   unproven steps. Include enough instructions to repeat the route.
7. Finish with structured observations, route checks, evidence references,
   unresolved checks, deviations, limits, blockers and actual execution paths.
   Keep `productVerdict: not-assessed`. A usable route can expose a product failure;
   discovery does not score correctness. Preserve all failures for later assessment.
8. Validate the result and hashes independently of native agent output. Inspect
   evidence yourself: validation establishes structure and integrity, not the
   truth of visual conclusions. Mark the result blocked or incomplete if the
   requested route lacks evidence. A draft alone is not an exercised workflow.

Version 2 removes the old case-specific contract. Saved version 1 results retain
their original validation rules; follow the compatibility guidance before working
with an older session. Repeat instructions and unresolved checks do not prescribe
which skill or phase must run next.
