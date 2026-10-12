# Setup and local configuration

Make BART's skills and linked docs readable by the agent already working in Core. No BART package install, provider setup or launcher is needed. Android work uses an existing compatible Androperator installation; follow its [setup](https://docs.androperator.com/setup/) when that is missing. Build tooling is selected in [builds](builds.md).

## Skill discovery

Keep a stable local BART checkout. Its canonical skills live in `.agents/skills/`; `.claude/skills` links to that directory and `CLAUDE.md` links to `AGENTS.md`.

For sessions working in Core, link the three `brave-core-bart*` skill directories into the host's personal discovery directory:

| Host | Personal discovery location |
| --- | --- |
| Claude Code | `~/.claude/skills/` |
| Agent-compatible hosts, including OpenCode | `~/.agents/skills/` |

Create each link only after inspecting the target directory and any same-named entry. Preserve existing user-owned entries and shared-directory links. Use an absolute source target such as `<bart-checkout>/.agents/skills/brave-core-bart`; repeat for report/reproduce. Do not install the contributor `bart-issue-create` into Core sessions. This setup writes outside Core and requires the user's setup scope.

Claude Code also supports session-local `--add-dir <bart-checkout>` discovery. See [Claude skills](https://code.claude.com/docs/en/skills) and [OpenCode skills](https://opencode.ai/docs/skills/) for current host behavior. OpenCode slash metadata on the main skill is optional host metadata; confirm the installed client's support. A sibling clone or parent directory is not proof of discovery from a Git worktree.

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
| `publication.qa.repository`, `.destination` | Default QA/investigation posting repository and item type. |
| `publication.pr.repository`, `.destination` | Independent prototype/PR posting repository and item type. |

Choose the checkout from explicit task selection, then config, then cwd if it is inside Core. Check repository root/content (including Core's `package.json`) and instructions/status; accept fork remotes. If configured checkout differs from cwd, state the selected checkout before product writes. Ambiguity or invalid selected paths need correction, not silent substitution.

Choose the task artifact directory from an explicit task directory, then configured work root. Select a suitable directory when files are needed and neither exists; ask only if the host/request leaves that choice unresolved. An external root or BART's ignored `.work/` is supported. Keep artifacts outside tracked source and the selected Core/Chromium source trees; check ignore coverage before writing inside BART. A text-only task does not need one. Source changes and build outputs stay in the build tool's normal workspace paths.

Missing config is supported. Use available checkout/device context and create/select artifacts only when needed. Resolve publication settings only for a publication request. A missing explicitly selected file or malformed relevant setting needs a clear correction; continue independent work with known inputs. Do not rewrite local config as incidental task work. BART configuration does not configure the host's credentials, provider or Androperator transport.

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
