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

## On-device capture labels

Use Androperator's diagnostic panel or native toast when it helps a reviewer understand a capture. These are agent-added annotations, not app UI or evidence that an action succeeded. Keep them out of the region being judged; omit them when they could obscure geometry, transient messages or a decisive transition. Preserve an unobstructed observation for visual measurements.

### Default panel placement

For English/LTR QA captures, start with the panel anchored to the right and text right-aligned, near the vertical middle of the usable screen. Browser controls and common bug targets are often at the top/bottom; a compact middle-right label can leave them visible. This is a starting placement, not a guarantee of non-occlusion. Move, reduce or omit it when the assessed content occupies that region; consider the actual layout for RTL or other UI configurations.

Keep the translucent background confined to the panel, only wide enough for readable debug content. Start around 200 dp wide with 10 sp text and an 8 dp edge inset; use short lines, separate package and version, then adjust width to avoid clipping/truncation. Do not extend the annotation background across the display or imitate a full-screen app scrim. Do not reduce text below readability merely to fit it.

The current API exposes `--top-offset-dp`, not a vertical-center anchor. Compute an approximate offset from current usable display geometry and panel height, excluding system-bar/cutout insets: `(usableHeightPx - panelHeightPx) / (2 * densityScale)` where `densityScale = densityDpi / 160`. Round to an integer and respect the supported offset range. Estimate height for initial placement, then use the returned physical-pixel `bounds` and an inspected screenshot to refine it. Do not pass native pixels directly as dp or hard-code one phone's midpoint for every device. Re-evaluate after rotation, display-size or font-scale changes; the API retains logical offsets rather than automatically re-centering the panel.

Before assessed recording, inspect an annotated baseline for readability, truncation, overlap with the app and possible toast region. Reposition before the trigger, not between a timing-critical action and its result. Clear the panel for an unobstructed final observation when needed. If reliable placement needs an unavailable API, record that gap in usage notes rather than invent a center flag.

QA on-screen logs should include the tested device's Android release version and API level, alongside the app/version and device model, for example `Android 17 | API 37`. Obtain both from the selected device, not the host SDK or an assumed version-to-API mapping. Keep this line readable and untruncated in the inspected capture; do not include the device serial.

The maintained [on-screen log API](https://docs.androperator.com/api/on-screen-logs/) supports live templates for foreground app package, version name/code, icon and device metadata. Use `--template`, not literal `--text`, for placeholders. Its currently documented template keys do not include Android release/API level; insert freshly observed values as literal text alongside the supported live placeholders, rather than invent keys. With `PANEL_TOP_DP` calculated for the current display, an illustrative small label is:

```sh
ANDROID_VERSION="$(adb -s "$SERIAL" shell getprop ro.build.version.release | tr -d '\r\n')"
ANDROID_API="$(adb -s "$SERIAL" shell getprop ro.build.version.sdk | tr -d '\r\n')"
# Check both reads succeeded and values are valid before constructing the label.
androperator on-screen-log set --template "BART capture
{{foreground_app.package_name}}
{{foreground_app.version_name}} | {{device.model}}
Android $ANDROID_VERSION | API $ANDROID_API" \
  --anchor right --text-align right --top-offset-dp "$PANEL_TOP_DP" \
  --edge-offset-dp 8 --width-dp 200 --font-size-sp 10 \
  --background-color '#B3000000' \
  --ttl-ms 120000 --device "$SERIAL" --operator-package "$OPERATOR_PACKAGE"
```

If either Android value is unavailable, label it unavailable and record the observation gap; do not supply a guessed value. Refresh these literals when switching devices and recheck panel height/placement for the extra line. They are caller-supplied observations, not live Android-version template fields.

The supported key is `{{foreground_app.package_name}}`, not a generic topmost-window ID. The template follows sampled foreground app context, excluding keyboard/its own overlay; system panels may retain the last verified app, and metadata may initially be unavailable. Inspect the captured label and separately retain [build identity](builds.md); the label is not proof of source revision, instant focus history or installed-byte identity.

Await separate set → capture → clear executions. Do not combine set, screenshot and clear into one action list: screenshot pixels may be acquired after the list finishes and the panel is cleared. `rendered: "true"` acknowledges drawing, and `operator_overlay_visible` reports panel state; neither proves it appears in the recorded pixels. Inspect the actual image/clip, retain the relevant receipts and clear the panel at the end:

```sh
androperator on-screen-log clear --device "$SERIAL" --operator-package "$OPERATOR_PACKAGE"
```

Use the [toast action contract](https://docs.androperator.com/api/actions/#show_toast) for brief action announcements, with `short` or `long` native duration. Toast submission does not wait for display/dismissal; Android can truncate or rate-limit it. If a toast is absent from a capture, do not claim it was visible. Its Operator icon is not the identity of the app being tested. See [the recipe](recipes.md#announce-an-external-action) for an ADB theme-change announcement.

Clear/cancel only the current annotations created for the task. Both APIs replace their previous annotation for the selected Operator; resolve other controller use first. API/CLI syntax was checked against maintained docs and installed CLI help; capture inclusion and live template/toast behavior still require observation on the selected device. Missing labeling support is a usage-notes finding, not a reason to block otherwise useful QA.

## Measured observations

When a measurable property helps investigate the reported behavior, retain the actual measurements alongside visible evidence. Useful properties include identified view bounds, distance to a relevant boundary, exact text/value, enabled state or observed transition timing. Use supported Androperator observations when available; document another authorized measurement source or fallback accurately.

Identify the object measured, method, units/coordinate space, capture dimensions/scale, build/device, conditions and observation time or capture ID. Link raw receipts and relevant screenshots; label annotations or derived calculations. State unavailable values as unavailable rather than infer them from a different object. Accessibility-node bounds, window bounds and painted pixel coverage are different observations; do not substitute one for another or claim internal layout properties were read when they were not exposed.

Report measurement facts without drawing a conclusion from them. For example: “The identified region's bottom edge was 2320 px in capture A and 2400 px in capture B; the display bottom was 2400 px in both.” Do not turn that into “this proves the fix works,” “the bug is fixed” or a causal attribution. Keep any separately scoped QA assessment distinct from the measurement record. Record uncertainty, rounding/tolerance and timing limits when relevant.

If comparing builds, keep relevant state and geometry comparable and identify each actual build. Historical comparison is optional and follows the requested scope; ordinary current-Nightly QA does not require a downgrade or old-build run. A measurement is useful only when its source exposes the relevant property; an absent/incomplete hierarchy is not evidence that a view is absent.

## Retain and share

Store notes/attempts in the task directory selected through [setup](setup.md#task-artifacts). Keep relative links and existing Androperator receipts where useful; record relevant conditions/source identity using [builds](builds.md). For remote device hosts, retrieve artifacts through the supported transport; a host-local path is not automatically readable by the agent or reviewer.

[Reporting](reporting.md#publication) owns authorized publication, destination selection and accessible links. Follow its [report privacy guidance](reporting.md#assessment-and-investigation): physical-device serials and other PII must be excluded from reports and shareable captures/receipts. Keep originals private and create clearly labeled redacted delivery copies without obscuring the behavior being assessed. Package historical results separately from future instructions using [reproduction](reproduction.md).

## Androperator usage notes

When using Androperator, maintain one `androperator-usage-notes.md` per agent session in the task directory. A single session can keep it at the task root; use session-specific subdirectories when several sessions share a task. Resume the same notes for a continued session and preserve earlier entries. Start with the goal, session identifier or start time, CLI/Operator versions and transport; update it as useful findings occur rather than reconstruct them only at the end.

Record actionable feedback about Androperator: missing or limited API capabilities, documentation gaps, unexpected results, feature requests and workarounds. For each finding, include:

- The operation needed, what was attempted and what was actually observed. Distinguish a confirmed limitation from a suspected gap or an untried capability.
- Relevant command/API inputs, error/result details, timestamps and command/task IDs, with references to existing logs or evidence where available.
- Any fallback, such as the exact `adb` command and target, why it was needed, its observed outcome and effect on the task. Ordinary APK installation or metadata reads through ADB are not automatically API gaps; identify when ADB replaced an operation sought from Androperator.
- The missing/unclear documentation page or desired API behavior, the task impact and a concise suggested improvement. Note later corrections when a supported route is discovered.

These are session feedback notes, not a second command log or a Brave QA verdict. Androperator's maintained [logging guidance](https://docs.androperator.com/api/logging/) describes its daily logs, normally under `~/.androperator/logs/`, and configurable locations/levels. Reference the actual log path and relevant IDs instead of copying whole logs; do not assume logging succeeded merely because execution continued. Keep credentials and unrelated private content out of notes intended for sharing.

If no gaps were encountered, a short closing note is sufficient; do not invent findings or narrate every successful action. Note-taking should not introduce approval pauses or interrupt useful execution. A fallback still follows the task's device/operation authority and must not be reported as Androperator coverage. Mention useful findings and the notes location in the session summary; publishing upstream feedback remains separately requested work.
