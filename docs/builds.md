# APKs, builds and installation

Use an artifact that fits the requested observation and identify the build actually tested. Reuse the selected checkout's current tools, a known APK or an existing retrieval route. No general BART artifact resolver is required.

## Select and identify an APK

Distinguish an exact PR-head build, a synthetic merge build, a local prototype and a release known to contain the change. An issue's reported version is a lead; a release comment does not prove an available APK or its source revision. Never silently replace an exact-build request with a later release assessment.

For a retrieved APK, retain relevant artifact/release/job URL, retrieval time, ABI, package/version/minimum API, signer and measured SHA-256. Compare a publisher digest when available. A hash identifies bytes, not source ancestry. Retain the job revision or supported release/source relationship separately. For a local prototype, record Core/Chromium revisions, relevant local diff, build arguments and actual output/receipt. Avoid copying a whole configuration or credentials into a report.

### Existing release assets

For a merged PR, follow release-bot comments such as “Released in v…” to the linked `brave-browser` release and inspect its actual assets before asking the user for an APK. A release mentioned on the PR can be the intended containing-release route even when no binary is linked directly in the PR body. Confirm source relationship and device compatibility; do not call it an exact PR-head build. If that release lacks a suitable APK, investigate supported alternatives and report the specific gap.

Inspect actual assets rather than construct a guessed filename:

```sh
gh release view "$TAG" --repo brave/brave-browser --json url,tagName,assets
gh release download "$TAG" --repo brave/brave-browser --pattern "$ASSET" --dir "$DOWNLOAD_DIR"
```

Select the tag/asset and new task download directory before running the download. Resolve missing APKs, unsupported ABI or digest mismatch explicitly. A later containing release can support retrospective assessment when its relationship is established and the scope permits it; label that assessment accordingly.

### Existing PR builds

Read the PR's check/status links, then the selected existing job's metadata, logs or artifact listing through its supported authorized route. Android APKs may be supplied by CI/artifact services outside GitHub Actions; `gh run download` helps only when the artifacts actually live there. Read access does not authorize triggering a new job.

Record the revision actually built, artifact identity and any head/merge distinction. Authentication failures, expired jobs and missing assets are explicit gaps. Do not invent an API for a service called StoryBoard or confuse it with Storybook UI previews. A verified service route can be documented when observed; until then use a supplied suitable APK or supported alternative and state missing exact-build coverage.

## Build with existing tools

Read the selected Core checkout's README, Android development/build configuration guidance and relevant test docs. Inspect its package scripts/help, current environment and `args.gn` when they affect the task. Build through Core's supported commands, with target OS/architecture, configuration and APK output chosen for the device. [Core's Android environment guide](https://github.com/brave/brave-browser/wiki/Android-Development-Environment) is a starting reference, not proof of local readiness.

For a prepared Core workspace, this is a starting command for a Debug arm64 APK, run from Core's root:

```sh
pnpm run build --target_os=android --target_arch=arm64 \
  --target_android_output_format=apk -C android_Debug_arm64 Debug \
  --gn=is_component_build:false
```

Confirm options against the selected checkout and its approved environment before execution. Remote execution, macOS Android support and other host-specific setup follow that environment's maintained instructions. Read the build's effective output rather than assume this directory or filename applies after forwarded options.

If optional Brave Scaffold is already available, use its `bcore-full-build-context` guidance and Android docs. For an explicitly selected checkout/device, a typical supported route is `bcore --checkout <checkout> build android --json`, followed by `bcore --checkout <checkout> run android --device <serial> --json` when install/launch is in scope. Check actual local help, effective arguments and returned artifact. Core remains usable without Scaffold; do not copy its support implementation into BART.

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

Observe versions, command line and relevant variations at `brave://version` when applicable, backed by current app evidence. Follow [verify](verify.md) for starting conditions and runtime activation. Record device model, Android/API, ABI and explicit serial in local receipts; omit unnecessary machine identifiers from published prose.
