---
name: bart-prepare-run
description: Prepare a frozen BART case for an Android run, retaining build provenance, device observations, setup authority and readiness evidence. Use before workflow development; stop before product verification.
---

# Prepare a run

Read [the Phase 2 contract](../../docs/run-preparation.md) and the selected case's
`first-pass/test-plan.md`, `case.json`, and manifest. Use configured
`BART_WORK_DIR` and `BART_BRAVE_CORE_DIR`; keep the reference checkout unchanged.
The input is the frozen case, build requirements, designated device/package and
permitted setup. The output is a validated preparation record, including blockers.

## Establish inputs

Resolve target and setup authority from the request or existing local configuration.
If either is missing, ask at that boundary and continue file-only work. Preserve
app data unless reset authority is explicit. Use one device throughout; never let
ADB or Clawperator select implicitly. Record every setup action and its time.

Brave Android package IDs:

| Channel | Package |
| --- | --- |
| Release | `com.brave.browser` |
| Beta | `com.brave.browser_beta` |
| Nightly | `com.brave.browser_nightly` |

A channel does not identify bytes or prove a source revision. Many cases need a
GitHub release APK. Locate an existing APK selector in the available skills or
local tools and retain its output when available. Historical `.context` guidance
contains release asset and digest research, but does not identify a callable
selector. If none is located, record that gap and accept an explicitly selected
local artifact using the case's saved release inventory. Do not invent a provider
API or build a general APK resolver. Use GitHub read-only.

Retain the asset URL, release/job, ABI, publisher digest, measured digest, package
metadata and signature receipt. Use the configured reference checkout's pinned
Git objects to check source ancestry. Distinguish exact PR head, containing release
and unresolved provenance. An installed app version alone cannot prove APK identity.
The CLI accepts the local APK and retains a content-addressed cache copy.

## Gather observations

Create an initial blocked record with the CLI, then save live receipts under that
run's `preparation/`. Supply those receipts to a new final preparation. Preserve
initial attempts and failures. Never edit a frozen package or erase old evidence.

- Save device model, Android/API, ABI and explicit serial from ADB read-only
  metadata. Save Clawperator `doctor --device SERIAL --operator-package PACKAGE`
  JSON. Require exit zero and `criticalOk: true`; if it fails, retain diagnostics
  and block Clawperator UI actions until setup is repaired. Do not use `--fix` or
  upgrade as an implicit recovery action.
- With setup authority, install the selected APK using the existing provisioning
  route or `adb -s SERIAL install -r APK`. Never uninstall to overcome signature
  conflicts. Pull the installed base APK and compare its hash to the selected APK;
  split packages need their own complete split identity receipts. Save package
  metadata and observe the active foreground package through Clawperator.
- Observe Brave/Chromium versions, command line and variations at `brave://version`.
  Retain the fresh hierarchy and screenshots, then inspect them. Missing values
  remain null. Check the case's required settings, flags, locale and site state.
- Establish Claude integration with a bounded child invocation that has explicit
  Clawperator tools. Save its prompt, exact arguments, MCP configuration, native
  output and device observation. The existing `agent-run` file-only profile and
  `doctor --claude` cannot pass this check. Keep `--safe-mode`, `--restricted`, and
  `--strict-mcp-config`; add only an explicit Clawperator MCP server and the tools
  required for a read-only snapshot probe. No arbitrary shell access is needed.
  Use the installed Claude CLI help to confirm accepted flags. The child must
  return an observed device fact backed by a successful tool result, not just a
  `READY` reply. Retain failures and mark integration blocked when not established.
- Check capture using a short Clawperator evidence video, finalize it, decode it
  with ffprobe/ffmpeg and inspect frames including rotation. Preserve original
  clips and action receipts. Do not confuse Operator action recordings with video.
  A video start receipt is not proof of a usable finalized recording.

For #39794, use the frozen build requirements, including the video-fit companion
fix. Observe both-study assignments. Select **one** current settings condition
(Disabled first by default), keep video-fit Enabled, relaunch and re-observe flags
and version/command-line state. Record a separate preparation or fresh variant
observation when switching to Enabled. Never report both as current conditions.
Leave gear actions, workflow discovery and assessed captures to Phases 3 and 4.

## Save and hand off

Write the contract's input JSON with evidence paths and assessed checks. Missing
checks become unknown. A pass needs a timestamp, method and inspectable receipt;
nonzero commands, missing tools, unclear screenshots and absent state do not pass.

```sh
./scripts/bart prepare-run <case-id> <absolute-input.json>
./scripts/bart validate-run <absolute-run-directory>
```

Preparation exits 1 when it saves a blocked record; inspect the printed run path.
Validation exits zero for a valid blocked record. Check `preparation.md` against
`run.json` and the actual receipts. Report implementation/preparation status apart
from product behavior. Link the record, name blockers with next actions, and remind
the Phase 3 agent to recheck mutable state. Do not run `bart-verify`, publish to
GitHub or infer a product verdict.
