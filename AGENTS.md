# Working on bart

Build toward the goal in [docs/north-star.md](docs/north-star.md). Use [docs/plan.md](docs/plan.md) for phase scope and completion conditions when implementing work. The project is in planning; `/bart-verify` does not exist yet.

- Use Node.js and TypeScript. Claude Code directs runtime verification through Clawperator.
- Keep GitHub access read-only and reference checkouts unchanged. External publication is deferred.
- Tie behavioral conclusions to observed evidence. Preserve failed attempts and report missing coverage; successful commands alone do not prove a pass.
- Keep machine-specific paths in local configuration and generated files under `BART_WORK_DIR`, with runs inside their cases.
- Name branches and worktrees for the work they contain. Do not include coding agent names anywhere in those names, regardless of separator. For example, neither `claude/feature-name` nor `claude-feature-name` is allowed.
- Create all worktrees under `.worktrees/` in the main repository checkout.

## Documentation

- Put only durable documentation in `docs/`, such as setup instructions, design decisions, and maintained project plans.
- Put non-durable information, including investigation notes, temporary findings, session reports, and execution evidence, under `BART_WORK_DIR`. Keep run-specific information inside its case/run directory.

## Writing

Use plain English in documentation, reports, commit messages, and user-facing responses. Prefer short, familiar words and active voice. Cut words that add no meaning and avoid stock figures of speech. Preserve facts, qualifications, and technical terms when simpler wording would lose precision. Explain what changed and why without achievement language.

## Commits

- Use Conventional Commits, such as `feat:`, `fix:`, and `docs:`.
- Commit completed, checked work at logical breakpoints. Stage only files that belong to the change.
- Add new commits for changes. Do not amend or otherwise rewrite existing commits unless the user explicitly asks.
- Attempt signed commits first. If signing cannot complete because the user is unavailable, an unsigned commit is allowed. Prefix its subject with `🚧`, keeping the Conventional Commit format after it, for example: `🚧 docs: clarify run setup`.
- Before an unsigned fallback, confirm the signed attempt did not create a commit. Do not bypass checks or hooks, and report why the commit is unsigned.
