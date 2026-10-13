# Setup and local configuration

Make BART's skills and linked docs readable by the agent already working in Core. No BART package install, provider setup or launcher is needed. Android execution needs compatible Androperator tooling; use the installation route below when missing. Build tooling is selected in [builds](builds.md).

## Missing Androperator installation

When runtime work is needed, check whether the selected interface is available; for local CLI use, inspect `command -v androperator` and `androperator --version`. Installed agent guidance or an existing Operator app alone does not establish CLI availability. Text-only/source-only work does not require Android setup.

If the CLI is missing, read and follow Androperator's maintained [public setup skill](https://androperator.com/skill.md), using its [setup guide](https://docs.androperator.com/setup/) for details. Do not reproduce its installer/prerequisite instructions in BART or replace Androperator with an all-ADB workflow merely because setup is missing. Use the existing package manager and setup scope, preserve user-owned configuration, and resolve real host-install/permission boundaries. If installation is outside the request or restricted by the host, ask for that specific setup action and continue independent source work.

After setup, load installed orientation/control-loop guidance, recheck the selected device/Operator compatibility and capability readiness, and verify an actual supported observation before resuming the app task. Record setup failures/recovery in usage notes. Canonical installation may remediate multiple connected targets; ensure every affected target is authorized or use the maintained supported targeted setup route. A setup command's exit alone does not establish readiness.

If setup cannot complete, return the precise blocker and honest runtime coverage limits, retaining useful local output. Do not silently drop required captures or claim ADB fallback provides Androperator coverage. Do not uninstall a working global installation just to simulate first use; clean-host/bootstrap validation is a separately scoped test, and documentation checks do not prove it passed.

## Skill discovery

Keep a stable local BART checkout. Its canonical skills live in `.agents/skills/`; `.claude/skills` links to that directory and `CLAUDE.md` links to `AGENTS.md`.

For sessions working in Core, link the three runtime skill directories into the host's personal discovery directory: `brave-core-bart`, `brave-core-bart-report` and `brave-core-bart-reproduce`.

| Host | Personal discovery location |
| --- | --- |
| Claude Code | `~/.claude/skills/` |
| Agent-compatible hosts, including OpenCode | `~/.agents/skills/` |

Create each link only after inspecting the target directory and any same-named entry. Preserve existing user-owned entries and shared-directory links. Use an absolute source target such as `<bart-checkout>/.agents/skills/brave-core-bart`; repeat for the other runtime skills. Do not install the contributor `bart-issue-create` into Core sessions. This setup writes outside Core and requires the user's setup scope.

Claude Code also supports session-local `--add-dir <bart-checkout>` discovery. See [Claude skills](https://code.claude.com/docs/en/skills) and [OpenCode skills](https://opencode.ai/docs/skills/) for current host behavior. OpenCode slash metadata on the main skill is optional host metadata; confirm the installed client's support. A sibling clone or parent directory is not proof of discovery from a Git worktree. To update a linked installation, update the stable BART checkout and reload skills or start a fresh session as the host requires; do not overwrite personal skill entries or local config. To remove it, remove only links that you verified point to this collection.

In a fresh normal session started in Core, confirm that the main skill appears and a linked doc can be read. Resolve doc links relative to the **real skill source**, not cwd or the symlink's parent. `../../../docs/builds.md` from a canonical skill resolves inside BART. If a host cannot follow the links, grant its supported additional-directory access or use the real source paths. Do not copy isolated skill files and strand their docs. Loading these instructions does not launch another agent.

## Developer quick start

Use your existing build-capable Core workspace and normal coding-agent session. Make the BART skills discoverable as above; have Androperator and an explicit device/emulator available when you want app inspection. Follow the [build guidance](builds.md) for your current Core environment rather than install a separate BART build system.

Invoke `/brave-core-bart` with the feature description and desired endpoint: implement locally, discuss before editing, inspect an existing change, or deliver a draft PR. For local build/install work, name the checkout (or explicitly use the current one) and device and include those operations in the request. There is no requirement to provide a GitHub URL, planning transcript or publication access. The maintained skills/docs supply shared context; the feature request and current checkout/app supply task context.

Optional workspace defaults below can save repeated paths. Publication settings are unnecessary for a local-only task. [Develop](develop.md#feature-intent-and-developer-collaboration) covers feedback and collaboration; choosing a local endpoint does not reduce autonomous execution or required observation checks.

## Configuration

Optional `<bart-checkout>/config.toml` supplies defaults. Start from [config.example.toml](../config.example.toml) without overwriting an existing local file. Omit unused fields. The current agent reads this small TOML file through its host tools; there is no BART config command.

The default config location is relative to the real BART skill source, independent of cwd. A config path explicitly supplied for the task selects that file instead; do not merge layered configurations. Relative workspace paths resolve against the selected config's directory, absolute paths stay absolute, and a leading `~/` expands from the host home directory. Blank paths and unchanged example placeholders are unresolved inputs.

| Setting | Meaning |
| --- | --- |
| `workspace.brave_core_dir` | Default Core checkout root, normally `<workspace>/src/brave`. |
| `workspace.work_dir` | Optional root for task notes, downloads and evidence, including BART's ignored `.work/`. |
| `brave-scaffold.enabled`, `.root` | Opt in to an existing Brave Scaffold checkout for local build/test work; omitted `enabled` means false. |
| `android.device_id`, `.operator_package` | Optional device and matching Operator defaults; pass the resolved selections explicitly to Android tools. |
| `android.phone_device_id`, `.tablet_device_id` | Optional independent phone/tablet targets for configuration coverage. |
| `privacy.blocked_words` | Array of nonempty literal sensitive strings excluded from export contents, filenames and directory names. Configured Android device IDs are included automatically; pass task-selected IDs to the export helper. |
| `publication.qa.repository`, `.destination` | Default QA/investigation posting repository and item type. |
| `publication.pr.repository`, `.destination` | Independent prototype/PR posting repository and item type. |

Choose the checkout from explicit task selection, then config, then cwd if it is inside Core. Check repository root/content (including Core's `package.json`) and instructions/status; accept fork remotes. If configured checkout differs from cwd, state the selected checkout before product writes. Ambiguity or invalid selected paths need correction, not silent substitution.

Choose the task artifact directory from an explicit task directory, then configured work root. Select a suitable directory when files are needed and neither exists; ask only if the host/request leaves that choice unresolved. An external root or BART's ignored `.work/` is supported. Keep artifacts outside tracked source and the selected Core/Chromium source trees; check ignore coverage before writing inside BART. A text-only task does not need one. Source changes and build outputs stay in the build tool's normal workspace paths.

Select the Android target from explicit task selection, then `android.device_id`, then the sole usable device. Multiple candidates without a selection require a choice. Use an explicitly selected Operator, then `android.operator_package`, otherwise the release default from maintained Androperator guidance. Recheck the selected target and compatibility/readiness when execution starts; config is not a historical readiness receipt. It selects device/package, not transport setup or permission to reset/install apps.

For [configuration coverage](verify.md#configuration-coverage), use explicit per-device task selections, then `android.phone_device_id` and `android.tablet_device_id`. The generic `device_id` can fill one role only after inspecting its actual device configuration; it does not replace the other role. Verify each target's device class, readiness and artifact compatibility. Use [emulator selection](#emulator-selection-and-setup) to fill missing coverage; do not reinterpret an ordinary phone as a tablet. Missing targets become explicit coverage gaps. Serialize control and do not operate a developer's device concurrently with another controller.

Missing config is supported. Use available checkout/device context and create/select artifacts only when needed. Resolve publication settings only for a publication request. A missing explicitly selected file or malformed relevant setting needs a clear correction; continue independent work with known inputs. Do not rewrite local config as incidental task work. BART configuration does not configure the host's credentials, provider or Androperator transport.

Set `brave-scaffold.enabled = true` and `brave-scaffold.root` to your existing [Brave Scaffold](https://github.com/brave-experiments/brave-scaffold) checkout when you want its maintained build/test workflow. Resolve `root` using the same relative/absolute/`~/` path rules as workspace paths; it is the Scaffold root, not Core. When enabled, use [Scaffold build guidance](builds.md#build-with-brave-scaffold) for local builds/tests. When disabled or omitted, use Core's supported standalone commands. An explicit task tool choice overrides this default without editing config.

An enabled installation needs a readable root, `.agents/skills/bcore-full-build-context/SKILL.md` and its `scripts/bcore` launcher. If missing, inspect available setup and report the specific integration gap; do not silently change build tools or install Scaffold. Resolve a supported fallback when the request allows it or ask only for the real tool/setup choice, continuing independent source work. A config flag selects tools, not build/install/sync authority or environment approval.

Development defaults in the example use issues in `brave-experiments/bart` for both report categories. Production defaults can be:

```toml
[publication.qa]
repository = "brave/brave-browser"
destination = "issue"

[publication.pr]
repository = "brave/brave-core"
destination = "pull-request"
```

Repository values use `owner/repo`; destination values are `issue` or `pull-request`. Item identity comes from the task/linked issue, not a global issue number. Explicit task destinations override the relevant default. Missing or invalid posting settings are resolved before publishing; never fill QA settings from PR settings or fall back to upstream. [Reporting](reporting.md#delivery-scope) owns the meaning of these destinations, comment versus creation scope and preview completion.

## Emulator selection and setup

A request to perform local Android QA or development includes routine selection, starting and creation of suitable host emulators needed for that work, unless the user or host rules restrict setup. Continue without asking separately for every emulator operation. Explain the selected target and material setup actions; configuration and skill loading alone do not authorize execution. Requests only to plan or explain do not authorize creating/starting devices.

Prefer, in order: a suitable running emulator not controlled by someone else, a suitable existing stopped AVD, then a new AVD only when no existing one meets the required device class/API/ABI. Inspect inventory and configuration before choosing. Preserve existing profiles, snapshots and local state; do not wipe, delete or repurpose user-owned AVDs to force a match. Routine setup may install the selected compatible Brave and Operator APKs and required emulator image within the task's scope, subject to host approval/access rules. Resolve real conflicts, resource shortages or restricted installs rather than repeated generic confirmation.

Use Androperator's maintained emulator help and supported SDK tools. Start with `androperator emulator list`, `inspect <name>` and `start <name>`; `provision` can implement reuse-first selection when its supported configuration fits. Inspect `create`/provision defaults before using them: a default phone emulator does not provide tablet coverage. For a tablet, use a genuine suitable tablet AVD/hardware profile through available supported tools, then verify its device configuration and app layout. Name newly created AVDs for their test purpose and record identity/setup in private task notes.

Wait for boot and explicit device discovery, check matching Operator readiness, and observe the app before testing. Record unavailable coverage when setup cannot complete; continue independent checks and return a useful report. Shutdown/cleanup should affect only task-owned instances within scope; do not stop another user's emulator or delete retained evidence/AVDs as incidental cleanup.

## Task artifacts

Create only files that help the work. A suggested layout under the selected root is:

```text
<task-name>/
  notes.md
  androperator-usage-notes.md
  builds/
  attempts/<label>/
  report.md
  pr-body.md
  reproduction/
  publication.md
```

Notes can begin with the objective, important sources, selected targets and next action. Keep relative evidence links and existing tool receipts where useful. Separate attempts when source/conditions change their interpretation. No required case/run schema, first-pass copy or automatic cleanup exists. Historical notes can guide continuation, but mutable device state needs fresh observation.

For a requested local HTML verification report, use a dedicated attempt directory and the [HTML delivery guidance](reporting.md#local-html-verification-report). Keep its captured media and supporting receipts locally so the directory remains readable when moved. This format is requested output, not a prerequisite for other tasks.

For sessions using Androperator, keep the [usage notes](evidence.md#androperator-usage-notes) alongside task artifacts. Use a session-specific subdirectory if multiple sessions share the task. Androperator's own logs remain in its configured location; the notes link to them and capture useful API/docs feedback and fallbacks.

Save useful newly discovered methods in optional task-local [recipe notes](recipes.md#save-recipe-candidates-from-a-session), with observed applicability and evidence. Link them from a report/export when present; they are candidates for later review, not automatically shared instructions.
