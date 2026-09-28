---
name: bart-develop-workflow
description: Develop and exercise a bounded Android workflow through Clawperator from a prepared BART run, retaining a temporary skill, discovery evidence and a validated result without scoring product behavior.
---

# Develop a workflow

Read the prepared run, its retained plan and context, and [the execution contract](../../docs/workflow-development.md).
For Brave/Chromium navigation and video controls, read the
[orientation skill](../../.agents/skills/brave-clawperator-orientation/SKILL.md).
Validate the preparation with `bart validate-run`. Treat every device observation
as historical. Recheck device, installed build, foreground package, flags after
relaunch, study assignments, site state and capture before discovery. Create a
new preparation when those conditions or setup authority change. Preserve old
preparations and failures.

Execute directly with the tools available to you. A child is optional. Record the
actual agent and mode; never substitute another product silently. The current
helper supports direct execution only. A requested launcher without an adapter
is a blocker, not permission to use the file-only task runner for device work.

Start a session with explicit instructions, target, preparation authority and
budgets. Only one controller may operate the device. The helper reserves a device
across BART sessions; coordinate other tools and people separately. Stop parent
device actions while a child owns it. Never clear a lock just because a process
has exited; inspect pending commands and active capture first.

Use the pinned [observation/action example](https://github.com/clawperator/clawperator-skills/blob/76bad61b5915e70dd53f38111eaf932c5ff92706/skills/com.android.settings.get-version-details-codex/SKILL.md)
for fresh observation, bounded actions, reacquisition and retained failures.
Its launcher and authentication are not part of this contract.

1. Select the pinned Clawperator CLI, explicit device and compatible Operator.
   Require doctor exit zero and `criticalOk: true`. Discover runtime skills by
   package and inspect their goal coverage. Prove action and observation access;
   an old snapshot probe alone does not prove this phase.
2. Observe current UI. Inspect full retained hierarchy and screenshots where
   needed. Check foreground, overlays, completeness and target bounds. A receipt
   exit code does not prove the desired state. Reference the current observation
   when choosing each action or bounded sequence; reacquire after transitions or
   uncertain effects. For transient controls, use the sequence contract instead
   of adding a screenshot round trip between every tap.
3. Retain every command, failure, timestamp and original capture under the session
   in `exploration/`. A malformed observation permits one bounded read-only
   recovery; never replay its preceding mutation. Stop if recovery fails.
4. Mark each calibration trial before entering its route. For #39794, use at most
   two trials across sessions unless the user explicitly revises the cumulative
   budget. Preserve that authorization and prior trials. Use one exploratory gear tap each. Use `gear`,
   never ordinary `action`, for that tap. Start continuous capture before native
   fullscreen entry. Establish native fullscreen, landscape controls and a
   current gear target. Preserve 10 seconds from dispatch and a further 3-second
   hold without Back, retap, rotation change or any other rescue. Keep the capture
   running; inspect all finalized clips, both rotations and decisive frames.
5. Stop for exhausted budgets, package/flag identity loss, crash, interstitial,
   ambiguous native fullscreen or unusable capture. Keep partial evidence and
   report what remains unresolved. Do not reset app/account data.
6. Save `skills/SKILL.md` within the session: preconditions, observed route,
   selectors and refresh rules, checks, observation points, capture boundaries,
   stopping rules and dependency/version references. Mark unproven steps clearly.
7. Prepare a Phase 4 handoff for Disabled then Enabled attempts and a separate
   harmless-option check. Carry forward the frozen timing and total attempt
   ceilings. Optional coverage stays `not_run`. Exploratory results never become
   scored results.
8. Finish with structured observations, evidence references, deviations, limits,
   blockers, actual execution paths and `productVerdict: not-assessed`. Validate
   the saved result and hashes separately from native agent output. Inspect the
   actual evidence yourself; the validator cannot judge pixels or behavior.

Finish a blocked session honestly when discovery cannot establish the route.
Supporting code or a temporary skill draft alone does not complete Phase 3.
