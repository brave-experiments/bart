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

## Development setup (Phase 0)

Use Node.js 24.16.0 (`nvm install && nvm use` if you use nvm), npm, and Git.
Clawperator is pinned to 0.12.0, which requires Node >=24.0.0. Phase 0 does
not invoke Clawperator. Install the locked dependencies:

```sh
npm ci
cp .envrc.example .envrc
# Edit .envrc to point BART_BRAVE_CORE_DIR at your Brave Core checkout.
direnv allow
# Or, without direnv:
source .envrc
npm run dev -- config
npm run check
```

Do not overwrite an existing `.envrc`. Load it before starting an agent so
its processes inherit the configuration. The local file is ignored by Git.

`BART_BRAVE_CORE_DIR` is required. It must point to the checkout root, with
package name `brave-core` and an `origin` URL for `brave/brave-core` on GitHub
(HTTPS or SSH). Validation reads local Git metadata and `package.json`; it
does not fetch, switch branches, or alter checkout files. A fork with a different
origin does not meet this initial identity check.

`BART_WORK_DIR` defaults to `$HOME/.local/share/bart`. Both variables accept
absolute paths or a leading `~/`, including quoted values in `.envrc`. Resolved
paths follow symlinks. The work directory must be outside BART and the reference
checkout. Validation creates it if needed and checks writability by creating and
removing an empty probe directory. It keeps existing data.

`npm run dev -- config` prints the validated paths and `childEnv`, an explicit
pair of resolved environment variables for later child processes. No child agent
integration exists yet. The output contains local paths; do not commit it.

Shared helpers in `src/config.ts` resolve the planned layout without creating
case or run outputs:

```text
$BART_WORK_DIR/
  cache/apks/
  cases/<case-id>/
    context/
    test-plan.md
    runs/<timestamp>-<id>/
      run.json
      skills/
      exploration/
      verification/
      report.md
```

Case and run IDs accept letters, numbers, hyphens, and underscores, starting
with a letter or number. Later phases must allocate unique run IDs, retain the
context and plan used by each run, and use relative evidence links. Phase 0 only
resolves their paths. There is no automatic cleanup.

Development commands:

- `npm run dev -- config`: validate local configuration and display resolved paths.
- `npm run typecheck`: check source and test types.
- `npm test`: test configuration errors, path layout, symlinks, and writability.
- `npm run build`: compile into ignored `dist/`.
- `node dist/cli.js config`: run the compiled CLI.
- `npm run check`: run type checks, tests, and the build.

Tests use disposable local Git fixtures and do not require a device or a real
Brave checkout. Dependencies and build outputs stay ignored; runtime working
files belong under `BART_WORK_DIR`. Phase 1 and later skills, including
`/bart-verify`, remain unimplemented.
