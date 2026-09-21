# bart

**Brave Automated Runtime Tester.**

A bot that investigates reported Brave Android issues and checks whether PRs fix them. The aim is to assist Brave QA with automated checks and evidence to help decide whether an issue can be closed.

The project is in early development.

The goal and example result below describe the project's [north star](docs/north-star.md).

## Goal

> Run the `/bart-verify` skill on PR https://github.com/brave/brave-core/pull/39794

The same workflow should also check whether a reported issue can be reproduced. It gathers context, prepares the build and device, develops an agent-driven workflow, records verification runs, and reports what happened.

## Intended result

The result should be a GitHub comment like this, with details and video links from the run. This is an example, not an actual test result: it assumes the issue occurs with the workaround disabled and the check passes with it enabled.

```markdown
#### 🟢 Verification PASSED for the scoped checks

Device/OS: <device / Android version>
Brave: <version> | Chromium: <version>
Build/source: <tested revision and relationship to PR #39794>

#### STEPS
1. Open the same video on m.youtube.com with the workaround Disabled, enter fullscreen, and tap the settings gear.
2. Repeat with the workaround Enabled after relaunch and flag verification.
3. Select a harmless settings option after the enabled transition.

#### ACTUAL RESULTS
- Disabled: reproduced the settings gear failing to open the menu.
- Enabled: fullscreen exited and settings opened without agent intervention.
- The selected settings option worked.
- Repeated-entry and non-fullscreen checks: not run. Full-case verification remains incomplete.

#### SCREENSHOT / SCREENCAST
- kBraveYoutubeFullscreenSettingsWorkaround - Disabled: <video link>
- kBraveYoutubeFullscreenSettingsWorkaround - Enabled: <video link>
- Supporting screenshots and run details: <report link>
```
