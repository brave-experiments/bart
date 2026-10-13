# Android and Brave action recipes

Use these recipes to perform common actions while preserving the state or trigger being tested. The issue's STR/TP takes precedence over a convenient shortcut. Select the explicit device, Brave package and Operator through [setup](setup.md#configuration); use current Androperator help for UI commands. A recipe supplies a method, not proof of its effect or new authority.

## Change system light/dark theme without leaving the app

For Android theme/lifecycle checks, keep the affected Brave screen foreground and change the **system** theme through ADB. Changing Brave's Appearance theme and returning to the screen exercises a different route and can mask restoration bugs. If the case requires following system theme, establish Brave's System default setting before entering the assessed screen, not during the decisive transition.

Read the target's supported commands and original mode:

```sh
adb -s "$SERIAL" shell cmd uimode help
adb -s "$SERIAL" shell cmd uimode night
```

With the target screen still foreground, perform the selected transition:

```sh
adb -s "$SERIAL" shell cmd uimode night no    # System light
adb -s "$SERIAL" shell cmd uimode night yes   # System dark
```

Run one transition at a time. Start evidence before the action and retain a visible baseline; then read back the mode and observe the app without navigating/relaunching to rescue it. Command acceptance alone does not establish theme change or restored content. Restore the original mode (including automatic/custom mode when supported), not an assumed default; preserve any relevant schedule settings if changed. Record the trigger and fallback/source accurately in the report and [usage notes](evidence.md#androperator-usage-notes).

This command route was exercised on an Android 17 Pixel during Wallet verification. Other Android/OEM versions need capability checks and actual observation. If unsupported, choose an authorized route that preserves the required state or report that trigger coverage is unavailable.

## Announce an external action

Use a brief Androperator toast when an offscreen ADB action would otherwise be unclear in a recording. For example, after starting capture and retaining the baseline, announce the intended theme transition, then execute it without leaving the tested page:

```sh
androperator toast "BART: change device theme to light" --duration short \
  --device "$SERIAL" --operator-package "$OPERATOR_PACKAGE"
adb -s "$SERIAL" shell cmd uimode night no
```

This text announces intent, not success. If the ADB command fails, preserve the failure rather than let the toast imply a completed transition. Read back and observe the actual theme/app state. Avoid adding a label operation between a timing-critical trigger and its outcome; it could delay or obscure the behavior being assessed. Use a pre-trigger announcement or omit it when necessary.

Native durations are `short` or `long`, not milliseconds. Toasts replace the previous API toast and can be truncated or rate-limited. Cancel a task-owned toast with `androperator toast --cancel --device "$SERIAL" --operator-package "$OPERATOR_PACKAGE"` when it obstructs a later observation; cancellation acknowledgement is not proof of disappearance. Inspect current pixels before an unobstructed final capture. Use [capture labels](evidence.md#on-device-capture-labels) for persistent version/device context and their visibility limits.

## Force display rotation

Read window-manager help and save the original user-rotation mode/value before changing it:

```sh
adb -s "$SERIAL" shell cmd window help
adb -s "$SERIAL" shell wm user-rotation
adb -s "$SERIAL" shell settings get system accelerometer_rotation
adb -s "$SERIAL" shell settings get system user_rotation
```

When the target supports `wm user-rotation`, request a locked display rotation:

```sh
adb -s "$SERIAL" shell wm user-rotation lock 1
# Later, another selected rotation:
adb -s "$SERIAL" shell wm user-rotation lock 0
```

Values are display rotations relative to its natural orientation: 0, 1, 2, 3 correspond to 0°, 90°, 180°, 270°. On a naturally portrait phone, 1 usually requests landscape and 0 portrait; do not assume that mapping on every device. Read back `wm user-rotation` and inspect actual display/app geometry through fresh hierarchy/screenshots. App orientation constraints can prevent the requested visible rotation. Do not silently override those constraints, resize the display or change density to manufacture the expected state.

Restore the original mode: `wm user-rotation free` when originally free, or `wm user-rotation lock <original-value>` when originally locked. Preserve other settings. If this route is unavailable, inspect the supported alternative rather than blindly write settings; retain its effects/restoration and coverage limits. Initial QA runs exercised forced rotation on selected phone/tablet targets; verify support and actual orientation on each new target. Captures crossing rotation require [video inspection](evidence.md#inspect-what-was-captured).

## Open Brave settings and find a setting

Follow the reported settings route when STR/TP provides one, because the entry point, nesting and back-stack can be part of the bug. Otherwise:

1. Open the selected Brave package using Androperator's `open` command and inspect the current screen. Opening may resume a previous screen; do not claim a fresh root start.
2. Find and open the browser menu from current labels/resource IDs or inspected imagery, then select Settings. Confirm the actual Settings screen; menu position/icons vary with toolbar configuration and version.
3. Use Settings search when visible and appropriate. Search for the user-visible setting or a useful keyword, inspect result context and select the intended row. Confirm the destination's title/content and relevant controls, rather than equate a matching search result with arrival.
4. If search is absent, misses the setting or enters a route that changes the case's conditions, navigate the observed categories and scroll the relevant container. Record a useful discovered route as a recipe candidate.

Search is a navigation aid, not a universally reliable route. Do not replace an issue's explicit route with search or a direct settings intent unless assessing that alternate route separately. Use semantic targeting and fresh observations; do not store fixed coordinates as a reusable recipe. For a test of foreground restoration, finish navigation/setup before the trigger and observe in place afterward.

## Save recipe candidates from a session

When a discovered method would help future work, record it in task-local `recipe-notes.md` and link it from the local report/export. This is optional useful knowledge, not another required output for every run. Include the goal, prerequisites, adaptive route or exact commands, original-state/restoration handling, observed result, tool/device/build versions and supporting evidence. Label untried variants and limitations. Keep historical findings separate from future-attempt instructions.

Use `androperator-usage-notes.md` for API/docs gaps and fallback feedback; use recipe notes for the reusable method and cross-link rather than duplicate raw logs. If creating an optional reproduction package, include applicable recipe notes or incorporate the necessary instructions with portable dependencies. Local export does not imply publication.

Promote a candidate into this shared document during an authorized BART documentation change only after reviewing its evidence, applicability and overlap with maintained Androperator guidance. Keep tool syntax upstream when it already has an owner. Do not automatically commit case-specific paths, coordinates or unverified claims as a durable recipe.
