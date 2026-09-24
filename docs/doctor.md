# Doctor

Run `./scripts/bart doctor` to check the host configuration, required tools,
and the selected agent. `BART_AGENT` defaults to `claude`; only that selection
requires Claude authentication/provider configuration. OpenCode needs neither
a Claude executable nor Claude authentication. Model access is checked only
when requested with `--claude`. It reports failures with suggested fixes and exits
with status 1 if any required check fails; otherwise it exits with status 0.

## Run the checks

From the BART repository or worktree:

```sh
source .envrc
./scripts/bart doctor
```

You can also use `npm --prefix node run dev -- doctor`. Load configuration with
`direnv` instead of `source` if preferred. The launcher does not load `.envrc`
itself and can run from another directory. Claude inherits the caller's
environment and working directory. Use the environment that will launch the
skill. See [agent configuration](agent-configuration.md) for Bedrock setup.

Plain `doctor` sends no model request and incurs no model inference charges.
To test an actual model response, explicitly opt in:

```sh
./scripts/bart doctor --claude
```

`doctor --claude` fails clearly when `BART_AGENT=opencode`; it does not invoke
Claude. OpenCode doctor checks only executable availability and version, not
authentication or model access.

This probe uses the network and may incur model charges or consume quota. It
runs only after Claude's authentication/provider configuration check passes.

To check one designated Android device, name its adb serial:

```sh
./scripts/bart doctor --device emulator-5554
```

Use `--operator-package com.clawperator.operator.dev` when the designated
device has the development Operator. The default is
`com.clawperator.operator`. The device check reads the connection state,
compares the installed Operator version with the selected Clawperator CLI,
and checks `screenrecord` and `screencap` availability. It does not record a
clip or prove that its image is readable. Run preparation must record, finalize,
and inspect a short clip before relying on capture for a case.

## Checks

| Check | What it establishes |
| --- | --- |
| Node.js | The version meets the package's declared range. An unsupported version stops the launcher before TypeScript loads. |
| Node package dependencies | The package-local TypeScript and lockfile-lint commands, YAML module, and pinned Clawperator package are present. Run `npm --prefix node ci` in each worktree when they are missing. |
| `BART_BRAVE_CORE_DIR` | The configured path is a Brave Core checkout root with the expected package name and Git origin. |
| `BART_WORK_DIR` | The explicit work path is outside BART and the reference checkout, and is writable. |
| Clawperator | The selected executable returns a version within ten seconds and meets the version pinned in `node/package.json`. |
| GitHub CLI, selected agent | Each executable returns a version within ten seconds. |
| `adb` | Android SDK Platform-Tools are on PATH and return a version. |
| `ffmpeg`, `ffprobe` | Both FFmpeg tools are on PATH and return a version. Clawperator checks both before starting video capture. |
| Android device (`--device` only) | The named device is connected, the selected Operator is version compatible, `screenrecord` advertises size and time-limit options, and `screencap` is available. |
| Claude authentication/provider configuration (Claude selected) | `auth status --json` reports configuration under the preparation flags within ten seconds. This alone does not validate provider credentials. |
| Claude model response (`--claude` only) | A model request returns a successful JSON result with the exact reply `BART_READY`. Exit 0 alone does not pass. |

Doctor prefers the package-local Clawperator executable and falls back to PATH.
It rejects an older version from either location. Run `npm --prefix node ci` in
this checkout to install the pinned version when the check fails. GitHub CLI,
`adb`, both FFmpeg tools, and the selected agent must be on PATH. Output uses
✅ for passing checks, ❌ for failures with suggested fixes, and ⚠️ for costs
and scope limits.
Raw Claude diagnostics are suppressed to avoid exposing account or credential data.
The closing line suggests `clawperator doctor --check-only` for Clawperator's
own readiness checks. Pass `--device <serial>` and `--operator-package <package>`
when needed.

On macOS, install missing `adb` with Android Studio's
[SDK Manager](https://developer.android.com/tools) or
`brew install --cask android-platform-tools`. Install both `ffmpeg` and
`ffprobe` with `brew install ffmpeg` from the
[Homebrew FFmpeg formula](https://formulae.brew.sh/formula/ffmpeg). Add the
installed executables to PATH and rerun doctor. On other systems, install
Android SDK Platform-Tools and FFmpeg from their platform packages. Doctor
reports the commands but never installs them.

## Claude probe and limits

Doctor uses the preparation flags:

```text
--safe-mode --restricted --strict-mcp-config
--tools Read,Write,Edit --permission-mode acceptEdits
```

The model probe selects `ANTHROPIC_DEFAULT_HAIKU_MODEL` when set, otherwise
Claude's `haiku` alias. It verifies that model, not every model a skill may use.
Doctor also denies the file tools and disables session
persistence. The request has a 30-second timeout, one turn, and Claude's `$0.01`
budget setting. That setting is a CLI stop condition, not a guaranteed billing
cap for a request already in flight. Subprocess output is limited to 64 KiB;
a timeout, excess output, invalid result, or unexpected reply fails the check.
Automated tests use mocks and make no model requests.

`--restricted` ignores Claude user, project and local settings, including
provider selection and credential helpers stored there. Export the intended
provider configuration before launching BART; do not remove the restrictions
to recover those settings. For direct Anthropic access, use `claude auth login`
in that environment. Bedrock users should follow [agent configuration](agent-configuration.md)
and renew their AWS login when needed.

Plain doctor does not log in, edit configuration, install tools, or operate devices.
`--device` reads the named device through adb and Clawperator's compatibility
check. Neither mode starts a recording.
Its path checks create the work directory if needed and create and remove a
temporary writability probe. Claude may refresh credentials and write its own
CLI state.

A default pass establishes local configuration and tool availability, not valid
provider credentials or model access. A pass with `--claude` also proves
one usable model reply in the tested context at that time. It does
not prove file-tool execution, full skill execution, case correctness, GitHub
authentication, device readiness, or full agent integration. A pass outside a
sandbox does not prove access inside it.

## Troubleshooting

| Failure | Next action |
| --- | --- |
| `Not logged in` with restricted flags | Confirm the parent exports `CLAUDE_CODE_USE_BEDROCK=1` and the intended AWS/model values. An Anthropic `/login` is not the fix for omitted Bedrock configuration. |
| Provider detected but no model reply | Check AWS login, model permissions, quota and network access in that same execution context. Renew SSO if needed, then rerun `doctor --claude`. |
| DNS or permission failure only in a sandbox | Use the host's approval flow for required access. Keep Claude's restrictions; do not bypass the sandbox. |
| Timeout or invalid result | Doctor has not established readiness. Check the provider and retry after resolving the cause. |
