# Contributing to BART

Keep the collection small and usable by the current agent. Skill bodies lead with outcome/completion and link to conditional guidance; they do not enforce a mandatory preparation workflow. Preserve checks that help judge actual behavior and remove bookkeeping without a consumer.

## Where content belongs

- `.agents/skills/`: canonical entry points. `.claude/skills` and `CLAUDE.md` are relative links, not second instruction sources.
- `docs/`: durable shared knowledge. Configuration/discovery belongs in setup, source research in understand, build identity in builds, capture/interpretation in evidence, delivery/outcomes in reporting, package/reuse semantics in reproduction.
- Task directory selected through setup, either external or ignored `.work/`: candidate test plans, research, notes, observed results, receipts and media. Keep those out of maintained docs except concise demonstrated capability status.
- `scripts/`: a helper only after repeated mechanical work demonstrates its need. Prefer standard-library Python 3.11+ for standalone artifact helpers and Node.js/TypeScript for existing-tool integrations. Use explicit inputs and meaningful behavior/failure checks. No custom documentation checker exists.

## Check a change

Run `git diff --check` and existing applicable checks. Read changed skills/docs against their consumers: verify names/frontmatter, local links, real symlink targets, configuration examples, authority and output semantics. Confirm links work from the source directory used through host discovery. Keep ignores covering retained local configuration/dependencies/output so unrelated files do not become untracked content.

A focused setup change may need native discovery checks; a runtime recipe needs scoped app observation. Record actual coverage and failures externally. Documentation edits do not automatically require a device/model request. Source tests/builds are run in their own selected Core workspace, not BART.

Do not overwrite unknown local work or erase ignored files as incidental cleanup. Update [capability status](plan.md) with demonstrated work and real gaps, not a claimed pass based only on process exit. Keep reusable knowledge in its owning document and link to it rather than accumulating repeated rules across skills.
