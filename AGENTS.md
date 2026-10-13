# Working on BART

Build toward [the project goal](docs/north-star.md) and track implemented and demonstrated capabilities in [the plan](docs/plan.md). BART supplies skills to the current coding agent. Use Androperator's maintained guidance for Android execution and Core's instructions for product work.

- Make instructions outcome-led and proportional. Understanding, acting and reporting can alternate; they are not required stages. Keep detailed conditional guidance in its owning document and link to it from skills.
- Follow the host's and selected checkout's authority rules. Skill discovery and local configuration grant no new permissions. Continue authorized work without repeated confirmation; resolve real target, scope or local-work conflicts.
- Tie behavior claims to inspected observations. Evidence conventions belong in [evidence](docs/evidence.md); outcome and delivery semantics belong in [reporting](docs/reporting.md).
- Keep machine paths in ignored `config.toml`. Put task notes, downloaded APKs and evidence in the working directory selected using [setup](docs/setup.md#configuration), outside tracked source; BART's ignored `.work/` is supported. Source changes and build tools use the selected Core workspace's own paths.
- Put durable shared knowledge in `docs/`, canonical skills in `.agents/skills/`, and any concrete mechanical helper in `scripts/`. Prefer standard-library Python 3.11+ for standalone artifact helpers; use Node.js/TypeScript where existing tooling makes it appropriate. Add executable tooling only for a demonstrated need.
- Keep investigation notes, session reports and case-specific test plans outside this repository's durable docs. Use historical observations as context, not current device state.
- Name branches and worktrees for their work, without agent/model attribution. Create BART worktrees under `.worktrees/` in the main checkout.

## Writing and checks

Use plain English, active voice and one source line per paragraph/list item. Preserve facts, qualifications and technical terms. Avoid generic process reminders and duplicated rules. See [contributing](docs/contributing.md) for checks appropriate to a skills collection.

## Commits

Commit completed, checked work at logical breakpoints using Conventional Commits. Stage only the change's files. Add new commits; do not amend or rewrite history unless requested. Push only when requested.

Attempt signed commits first. If signing cannot complete, confirm the attempt created no commit and all non-signing checks passed before one unsigned fallback. Prefix its subject with `🚧`, followed by the Conventional Commit subject. Preserve hooks and report the signing failure.
