# BART

BART is a collection of skills that help an existing coding agent understand, develop, investigate and verify Brave Android through source code and the running app.

The current agent reasons, edits code and assesses results. [Androperator](https://docs.androperator.com/host-agents/) supplies Android actions, observations and evidence. Brave Core and existing development tools supply builds, installs and repository operations.

## Use an ordinary request

Use the same entry point for autonomous execution and developer collaboration. A feature description, design reference or app observation can start the work; a GitHub issue or PR is optional.

### Develop a feature locally

```text
/brave-core-bart Implement <feature description> in this Brave Android checkout.
Use emulator-5554. Build, install and inspect the result locally.
Keep everything local; do not push or create a PR.
```

### Discuss an approach before implementation

```text
/brave-core-bart Help me develop <feature description>.
Inspect the relevant source and discuss the approach with me before editing.
```

### Investigate an issue or verify a PR

```text
/brave-core-bart look at https://github.com/brave/brave-browser/issues/59445.
Prototype a fix in a draft PR
```

```text
/brave-core-bart verify the fix in https://github.com/brave/brave-core/pull/40517.
```

Understanding, acting and reporting are capabilities, not ordered phases. Start with the code or app, return to research when an observation raises questions, and revise the approach as needed.

The agent continues authorized implementation and validation without routine approval pauses. A developer can request a discussion checkpoint or contribute code/app observations during the work. Local development finishes with the implementation, requested checks/runtime inspection and a concise summary; publication and reproduction packages remain separately scoped. See the [developer quick start](docs/setup.md#developer-quick-start).

## Skills

| Skill | Purpose |
| --- | --- |
| [brave-core-bart](.agents/skills/brave-core-bart/SKILL.md) | Main entry point for Brave Android work. Loads relevant guidance as needed. |
| [brave-core-bart-report](.agents/skills/brave-core-bart-report/SKILL.md) | Assessments, investigations, prototype demonstrations and draft PRs. |
| [brave-core-bart-reproduce](.agents/skills/brave-core-bart-reproduce/SKILL.md) | Optional adaptive reproduction instructions for another attempt. |

Follow [setup](docs/setup.md) to make the skills available to the agent working in Core. There is no BART CLI, agent launcher or required Node installation. Shared guidance lives in `docs/`; skills link to it rather than duplicate it.

## Local configuration

Optional `config.toml` selects the Core checkout, artifact directory and independent QA/PR posting defaults. [config.example.toml](config.example.toml) directs development publication to BART issues. A source issue or PR URL does not select the write destination.

Verification returns an assessment; posting requires a posting request. A BART issue containing a PR description is a preview, not completion of a request to create a real draft PR. See [reporting and delivery](docs/reporting.md).

## Status

The skills, configuration guidance and supporting documents are available. Fresh-session source/app workflows, exact PR APK retrieval, publication and reproduction reuse still need live validation. The examples above are requests to try, not recorded results. See the [maintained plan](docs/plan.md) and [project goal](docs/north-star.md).

Contributors: read [AGENTS.md](AGENTS.md) and [contributing](docs/contributing.md). [bart-issue-create](.agents/skills/bart-issue-create/SKILL.md) is a repository-local contributor skill, separate from the runtime collection.
