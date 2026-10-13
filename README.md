# BART

**Ask your coding agent to check Brave Android, and get findings you can inspect.**

BART helps an agent investigate issues, verify fixes and develop changes using both Brave Core source and the running Android app. It gives the agent Brave-specific guidance for testing, evidence and reporting. You describe the work in ordinary language; the agent chooses the relevant checks and tools.

For QA, the benefit is more coverage with reviewable evidence: phone and tablet layouts, landscape behavior, system-theme changes and configuration-specific controls. For engineers, the same skills support local development and an optional QA pass before submission. Reviewers get the tested build, what actually happened, captures and clear coverage limits.

## Try a QA verification

Once [set up](docs/setup.md), start your usual coding-agent session and ask:

```text
/brave-core-bart QA verify https://github.com/brave/brave-core/pull/40563.
Save a local HTML report, captures and text-only context ZIP under .work/pr-40563/.
Do not publish findings.
```

Ordinary verification of a merged fix uses **current Nightly**, rather than requiring the original PR build. The agent inspects the issue, PR and relevant source, exercises the app, and records observations. It prefers suitable existing emulators and can prepare one when needed within the authorized task and host rules. Missing devices, prerequisites or evidence are reported, not counted as passing checks.

Use `/brave-core-bart` as the main entry point. You do not need to invoke a series of preparation commands or supply a formal test package.

## What you get

A QA report leads with a familiar summary:

```text
🟢 Verification PASSED using the following:
Automated BART assessment - not an official QA sign-off.

Device, build and conditions
STEPS
ACTUAL RESULTS
SCREENSHOT / SCREENCAST
```

The headline reflects the findings: passed, failed, blocked, inconclusive or partial. This is an example format, not a recorded pass.

The report includes:

- **Tested identity:** device make/model, Android version/API, Brave and Chromium versions, Androperator version and available model/execution context.
- **Actual results:** observed behavior, relevant failures and any additional issues spotted during testing.
- **Configuration coverage:** phone/tablet, portrait/landscape and system-theme checks, with useful captures and explicit omissions.
- **Visible evidence:** labeled screenshots and transition recordings, with inspection and timing limits stated.
- **Reproduction context:** a compact text-only ZIP for published reports or when requested locally, containing useful commands, test inputs, instructions and sanitized receipts. Media and APKs stay separate.

Requested local HTML opens with its capture assets using relative links. Reports exclude device serials and other personally identifying information. Measurements can add precise observations, but are not presented as universal proof that a bug is fixed.

**BART assists QA; it does not provide official QA sign-off.** A successful command is not automatically successful app behavior, and untested configurations remain untested. See [reporting](docs/reporting.md) for the output conventions.

## For engineers

Develop a feature locally:

```text
/brave-core-bart Implement <feature description> in this Android checkout.
Build, install and inspect it on my configured device. Keep everything local.
```

Run an optional pre-submit QA pass:

```text
/brave-core-bart QA my local Android changes before submission.
Build and inspect them on phone and tablet. Save a local HTML report and captures.
Do not edit product code or publish findings.
```

A local pre-submit pass tests **your changed build**, not an unrelated installed Nightly. It supplements Core's normal tests and presubmit checks.

You can ask to discuss the approach before editing, contribute feedback during the work, or let the agent continue authorized implementation and testing autonomously. A GitHub URL is optional; a feature description, design reference or app observation can start the task. The agent can move between source research, app inspection and changes as needed. Local development normally ends with a concise summary rather than a formal QA report.

Development guidance is available; end-to-end feature development through BART still needs a dedicated live demonstration. See [developing](docs/develop.md) and the [validation plan](docs/plan.md).

## Get started

1. Make the BART skills discoverable to your existing agent, following [setup](docs/setup.md#skill-discovery).
2. Use a Brave Core checkout for source work and [Androperator](https://docs.androperator.com/host-agents/) for Android actions and evidence. Local builds use Core's existing tools; Brave Scaffold is optional.
3. Optionally set checkout, work-folder, device and posting defaults in ignored `config.toml`, using [config.example.toml](config.example.toml). Missing config is supported when the task supplies the needed context.

BART runs through the agent already in your session. It does not require a BART CLI, separate agent launcher or model-provider account. Skills and shared docs supply the guidance; the host agent and existing tools perform the work.

Task artifacts can live in ignored `.work/` or an external directory. Publication occurs only when requested and permitted by the host. The example configuration sends development reports and PR previews to BART issues; a preview is not an actual Core draft PR. See [configuration](docs/setup.md#configuration) and [delivery scope](docs/reporting.md#delivery-scope).

## Current maturity

Initial local QA runs have exercised Wallet settings across system-theme changes and Appearance settings on phone/tablet configurations. They produced HTML reports, captures and text context, and identified a tablet-only icon/alignment omission. Coverage and evidence quality are still being refined; these runs are not a reliability benchmark or complete regression suite.

Fresh-session development, actual draft-PR delivery, external publication and independent reuse of exported reproduction instructions need further validation. BART is ready for more scoped QA trials, with findings and limitations reviewed by people. The [maintained plan](docs/plan.md) tracks capabilities and gaps.

## Supporting skills and guidance

| Skill | Use |
| --- | --- |
| [brave-core-bart](.agents/skills/brave-core-bart/SKILL.md) | Main entry point for development, investigation and verification. |
| [brave-core-bart-report](.agents/skills/brave-core-bart-report/SKILL.md) | Create or update a report from observations and evidence. |
| [brave-core-bart-reproduce](.agents/skills/brave-core-bart-reproduce/SKILL.md) | Save optional adaptive instructions for another attempt. |

Shared guidance covers [verification](docs/verify.md), [builds](docs/builds.md), [evidence](docs/evidence.md), [action recipes](docs/recipes.md) and [Brave QA resources](docs/qa-resources.md). Contributors should read [AGENTS.md](AGENTS.md) and [contributing](docs/contributing.md); [bart-issue-create](.agents/skills/bart-issue-create/SKILL.md) helps draft issues about BART itself.
