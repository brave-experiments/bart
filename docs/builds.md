# APKs, builds and installation

Use an artifact that fits the requested observation and identify the build actually tested. Reuse the selected checkout's current tools, a known APK or an existing retrieval route. No general BART artifact resolver is required.

## Select and identify an APK

For ordinary QA verification of a merged fix, assess the current Nightly, not a historical snapshot. Check the installed Nightly and the newest suitable published Nightly at execution time. Reuse the installed build if current, including when it is newer than the available release inventory and its identity/source relationship supports the check. If a newer compatible Nightly is available, update in place within the task's install scope and preserve app data. Do not downgrade to the first release containing the fix merely because the PR links to it. State a newer unavailable build or update blocker rather than describe an older tested build as latest.

Distinguish an exact PR-head build, a synthetic merge build, a local prototype and a release known to contain the change. An issue's reported version is a lead; a release comment does not prove an available APK or its source revision. Never silently replace an exact-build request with a later release assessment.

Use an exact PR build or historical before/after comparison when explicitly requested or needed for a specific causal investigation. Lack of that comparison does not block a current-Nightly behavior assessment. Report the build actually tested and whether it contains the fix; observing correct behavior now does not prove which intervening change caused it.

For a retrieved APK, retain relevant artifact/release/job URL, retrieval time, ABI, package/version/minimum API, signer and measured SHA-256. Compare a publisher digest when available. A hash identifies bytes, not source ancestry. Retain the job revision or supported release/source relationship separately. For a local prototype, record Core/Chromium revisions, relevant local diff, build arguments and actual output/receipt. Avoid copying a whole configuration or credentials into a report.

### Existing release assets

For a merged PR, follow release-bot comments such as “Released in v…” to establish when the fix became available and help confirm its inclusion in current Nightly. For normal QA, inspect the newest suitable Nightly assets, not only that first-containing release. The linked release's own assets remain useful when a historical build is requested. Follow these available routes before asking the user for an APK; confirm source relationship and device compatibility and keep exact PR-head claims separate.

Inspect actual assets rather than construct a guessed filename:

```sh
gh release view "$TAG" --repo brave/brave-browser --json url,tagName,assets
gh release download "$TAG" --repo brave/brave-browser --pattern "$ASSET" --dir "$DOWNLOAD_DIR"
```

Select the tag/asset and new task download directory before running the download. Identify the channel from release/package information; the GitHub `latest` release or `prerelease` flag alone is not a Nightly selector. Paginate releases as needed, compare actual versions and inspect asset availability. Resolve missing APKs, unsupported ABI or digest mismatch explicitly. A current containing release supports present-day QA without an exact PR artifact; record the actual build and source relationship.

### Existing PR builds

Read the PR's check/status links, then the selected existing job's metadata, logs or artifact listing through its supported authorized route. Android APKs may be supplied by CI/artifact services outside GitHub Actions; `gh run download` helps only when the artifacts actually live there. Read access does not authorize triggering a new job.

Record the revision actually built, artifact identity and any head/merge distinction. Authentication failures, expired jobs and missing assets are explicit gaps. Do not invent an API for a service called StoryBoard or confuse it with Storybook UI previews. A verified service route can be documented when observed; until then use a supplied suitable APK or supported alternative and state missing exact-build coverage.

### PR review workspace and build

For explicitly requested runtime-backed review, select a build-capable review workspace, inspect starting branch/revisions/local work and pin the current PR head/base. Fetch the required PR objects through the supported repository route and verify the checked-out revision matches the reviewed head; label a merge build or later updated head separately. Do not redirect or overwrite a developer's active work to prepare the review. A Core-only Git worktree may lack the corresponding Chromium/dependency workspace.

When checkout and sync are requested, use the selected Core/Scaffold maintained source workflow to align Chromium and dependencies with that revision before building. Sync can change/reset source; inspect and preserve wanted work first, and resolve actual conflicts without stashing/discarding implicitly. Reading a build skill or passing doctor does not expand authority to sync. Record effective Core/Chromium revisions, configuration and output; a blocked sync/build limits runtime review but leaves source review useful.

Build/install the selected PR revision using the configured build route below or a supported identified PR artifact. Keep product fixes and optional diagnostic modifications separate from the reviewed build. Current Nightly is not a substitute for an open PR artifact. Recheck whether the head changed before final reporting and state the exact reviewed/tested revision and any later unreviewed changes.

## Build with existing tools

For local pre-submit QA, test an APK built from the selected branch and actual local changes, recording their revision/diff and effective build output. Do not substitute current Nightly and claim the developer's changes were assessed. Select compatible artifacts for each phone/tablet target; reuse one build only where its ABI/API requirements fit both. [Pre-submit guidance](verify.md#local-pre-submit-qa) defines the scope and unattended prerequisites.

Select the build workflow from the task's explicit tool choice, otherwise [configuration](setup.md#configuration). With `brave-scaffold.enabled = true`, follow the section below. Otherwise use Core's standalone route. This choice affects local builds/tests, not ordinary existing-Nightly QA or Androperator's device-control role.

### Build with Brave Scaffold

Resolve `SCAFFOLD_ROOT` from `brave-scaffold.root` and `CORE_DIR` from BART's selected Core checkout. Load the **local** `$SCAFFOLD_ROOT/.agents/skills/bcore-full-build-context/SKILL.md` in the current agent, through native skill loading only if it resolves to that selected installation; otherwise read the file directly. Its [upstream skill](https://github.com/brave-experiments/brave-scaffold/tree/main/.agents/skills/bcore-full-build-context) is a reference, not a substitute for the installed revision. Consult its linked agent-workflow and Android docs as needed. Do not copy its test mapping, support scripts or API contracts into BART.

Call the selected installation's absolute launcher, passing the resolved Core path so Scaffold does not infer another checkout from cwd or conflicting defaults. Typical commands, subject to that installation's current help and capability support:

```sh
"$SCAFFOLD_ROOT/scripts/bcore" --checkout "$CORE_DIR" doctor android --json
"$SCAFFOLD_ROOT/scripts/bcore" --checkout "$CORE_DIR" build android --json
"$SCAFFOLD_ROOT/scripts/bcore" --checkout "$CORE_DIR" test android --plan --json
"$SCAFFOLD_ROOT/scripts/bcore" --checkout "$CORE_DIR" run android --device "$SERIAL" --json
```

Use build/run only within the requested operations. When building and launching are both requested, the maintained skill's `build-run android --device "$SERIAL" --json` route can tie deployment to that completed build. A plan previews commands and does not run tests; execute selected tests when authorized. Test discovery finds changed test files, not every test affected by production code; inspect its unmapped/unselected results and select a relevant existing suite/file/filter when necessary. No selected tests is not a passing regression suite.

Keep the skill's configured Debug/architecture/remote-execution behavior unless the task requires other effective options. “Locally on my machine” does not by itself disable the configured remote compiler service; use an offline option only for an explicitly selected offline build. Match the actual APK to each device and inspect the returned artifact before Androperator observations.

Honor the selected checkout's approved environment and Scaffold's normal guarded patch/support preparation. Requested builds/tests may write their declared source/output paths; inspect existing work and ensure exclusive use. Doctor/repair suggestions and config do not authorize sync, cleanup, support checkout/branch changes, tool installation or `direnv allow`; only the user approves environments. If preparation conflicts with local work, retain the failure and resolve it rather than bypass guards or switch to a direct build that evades them. Android support/test overlays remain tooling state and stay out of feature commits.

Read JSON outcomes, per-suite results/counts, warnings, returned artifact identity and diagnostic paths using the maintained skill's contracts. Retain commands/effective options and useful build/test/deploy receipts in task notes, with privacy-safe exports when reported. A successful build or process launch is followed by independent app/version/behavior observation through Androperator. Report setup/build failure, missing test coverage or unresolved output precisely; do not run an older output and claim it represents the feature change.

### Build directly with Core

Read the selected Core checkout's README, Android development/build configuration guidance and relevant test docs. Inspect its package scripts/help, current environment and `args.gn` when they affect the task. Build through Core's supported commands, with target OS/architecture, configuration and APK output chosen for the device. [Core's Android environment guide](https://github.com/brave/brave-browser/wiki/Android-Development-Environment) is a starting reference, not proof of local readiness.

For a prepared Core workspace, this is a starting command for a Debug arm64 APK, run from Core's root:

```sh
pnpm run build --target_os=android --target_arch=arm64 \
  --target_android_output_format=apk -C android_Debug_arm64 Debug \
  --gn=is_component_build:false
```

Confirm options against the selected checkout and its approved environment before execution. Remote execution, macOS Android support and other host-specific setup follow that environment's maintained instructions. Read the build's effective output rather than assume this directory or filename applies after forwarded options.

Use the actual effective output from the completed build. A failed or interrupted rebuild can invalidate an older success receipt and leave old bytes at the same path. Inspect the outcome before retry/install; do not claim an older default APK is the new prototype. Keep relevant build failures and test results. A runner's zero exit with missing counts or no selected tests is not proof of passing regressions.

## Install and observe identity

Package leads are:

| Build channel | Common package |
| --- | --- |
| Release | `com.brave.browser` |
| Beta | `com.brave.browser_beta` |
| Nightly | `com.brave.browser_nightly` |
| Local development | May use `com.brave.browser_default` |

Read actual APK metadata with available Android tools such as `aapt2`/`apkanalyzer` and signer information with `apksigner`. Filenames and channel labels do not establish package identity. Check ABI/API compatibility with the selected device. Preserve data unless reset is part of the authorized task; resolve signature conflicts without automatic uninstall.

For a compatible single APK, a direct install route is `adb -s "$SERIAL" install -r "$APK"`. Use a supported installer for complete split sets and identify all splits. Inspect installation result, installed package and foreground app. Where practicable compare installed APK bytes with the selected artifact; otherwise state the identity limit. Process launch alone does not prove the requested screen rendered.

Observe versions, command line and relevant variations at `brave://version` when applicable, backed by current app evidence. Follow [verify](verify.md) for starting conditions and runtime activation. Record device model, Android/API and ABI. Keep any targeting serial only in private local configuration/receipts; follow [report privacy](reporting.md#assessment-and-investigation) to exclude it from reports and shareable assets.

Capture actual in-app Brave/Chromium versions and revision on each tested device when available, especially after installation/update. Release metadata is selection context, not a replacement for observing the running app. If a field or in-app page is unavailable, retain the attempted read and identify the alternate source/limit in the report rather than present it as observed in app. Use available APK/installed identity checks to support the selected build; explain omitted checks when they materially limit identity. Do not weaken build identification just because a visual issue was found.
