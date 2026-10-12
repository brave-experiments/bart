# Capture and interpret evidence

Retain observations while doing the work so a reader can assess the claim. Androperator's [evidence guidance](https://docs.androperator.com/api/evidence/) owns capture syntax, prerequisites, result contracts and lifecycle; use installed compatible guidance rather than a BART wrapper.

## Choose observation points

Capture the starting condition, decisive action/transition and resulting state when they affect the claim. Label build/condition variants clearly. Long setup can stay outside a concise reviewer clip, with supporting observations linked. A small visual prototype may need readable stills; a timing/transition claim may need continuous video.

Keep useful action receipts and fresh hierarchies/screenshots. Correlation and timing help relate the action to observations, but sequential screenshot/hierarchy captures are not atomic. Saved route coordinates are not current targets; use semantic selection and fresh screen evidence. Follow Androperator's actual image/native geometry guidance if coordinate input is necessary.

## Inspect what was captured

- Open the actual image, not just its path. Fine shape/color/text may need a higher-detail fresh screenshot. A hierarchy does not establish visual styling, occlusion or contrast.
- Wait for the relevant state and confirm it remains active. Dismissing a keyboard can also remove focus and invalidate a visual check. Higher resolution cannot repair the wrong state.
- Finalize video and inspect decisive intervals, rotation, cropping, readability and final hold. Check all video artifacts when display changes produce multiple clips. A recording start receipt or successful decode is not proof that the important behavior is visible.
- Inspect capture failures and partial artifacts. A usable screenshot may support a limited claim even if hierarchy/video capture failed. Capture status and app outcome are independent; state the gap rather than discard usable observations.
- Preserve original recordings and relevant failed attempts. Trim only irrelevant lead-in/trailing footage for delivery and label derived media; do not cut out decisive waits, transitions or interventions. A later clean run does not erase an earlier valid failure.

Uninspected media supports no visual conclusion. Tool completion does not establish behavior; the agent must assess the actual observations. If decisive evidence is missing, report the limit or perform a new scoped attempt, not a reconstructed transition.

## Retain and share

Store notes/attempts in the task directory selected through [setup](setup.md#task-artifacts). Keep relative links and existing Androperator receipts where useful; record relevant conditions/source identity using [builds](builds.md). For remote device hosts, retrieve artifacts through the supported transport; a host-local path is not automatically readable by the agent or reviewer.

[Reporting](reporting.md#publication) owns authorized publication, destination selection and accessible links. Keep raw evidence local and select useful, task-appropriate material for delivery. Package historical results separately from future instructions using [reproduction](reproduction.md).

## Androperator usage notes

When using Androperator, maintain one `androperator-usage-notes.md` per agent session in the task directory. A single session can keep it at the task root; use session-specific subdirectories when several sessions share a task. Resume the same notes for a continued session and preserve earlier entries. Start with the goal, session identifier or start time, CLI/Operator versions and transport; update it as useful findings occur rather than reconstruct them only at the end.

Record actionable feedback about Androperator: missing or limited API capabilities, documentation gaps, unexpected results, feature requests and workarounds. For each finding, include:

- The operation needed, what was attempted and what was actually observed. Distinguish a confirmed limitation from a suspected gap or an untried capability.
- Relevant command/API inputs, error/result details, timestamps and command/task IDs, with references to existing logs or evidence where available.
- Any fallback, such as the exact `adb` command and target, why it was needed, its observed outcome and effect on the task. Ordinary APK installation or metadata reads through ADB are not automatically API gaps; identify when ADB replaced an operation sought from Androperator.
- The missing/unclear documentation page or desired API behavior, the task impact and a concise suggested improvement. Note later corrections when a supported route is discovered.

These are session feedback notes, not a second command log or a Brave QA verdict. Androperator's maintained [logging guidance](https://docs.androperator.com/api/logging/) describes its daily logs, normally under `~/.androperator/logs/`, and configurable locations/levels. Reference the actual log path and relevant IDs instead of copying whole logs; do not assume logging succeeded merely because execution continued. Keep credentials and unrelated private content out of notes intended for sharing.

If no gaps were encountered, a short closing note is sufficient; do not invent findings or narrate every successful action. Note-taking should not introduce approval pauses or interrupt useful execution. A fallback still follows the task's device/operation authority and must not be reported as Androperator coverage. Mention useful findings and the notes location in the session summary; publishing upstream feedback remains separately requested work.
