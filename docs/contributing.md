# Contributing to BART

Keep the collection small and usable by the current agent. Skill bodies lead with outcome/completion and link to conditional guidance; they do not enforce a mandatory preparation workflow. Preserve checks that help judge actual behavior and remove bookkeeping without a consumer.

## Where content belongs

- `.agents/skills/`: canonical entry points. `.claude/skills` and `CLAUDE.md` are relative links, not second instruction sources.
- `docs/`: durable shared knowledge. Configuration/discovery belongs in setup, source research in understand, build identity in builds, capture/interpretation in evidence, delivery/outcomes in reporting, package/reuse semantics in reproduction.
- External task directory: candidate test plans, research, notes, observed results, receipts and media. Keep those out of maintained docs except concise demonstrated capability status.
- `scripts/`: a helper only after repeated mechanical work demonstrates its need. Use Node.js/TypeScript, explicit inputs and meaningful behavior/failure checks. No required runtime package or custom documentation checker exists.

## Check a change

Run `git diff --check` and existing applicable checks. Read changed skills/docs against their consumers: verify names/frontmatter, local links, real symlink targets, configuration examples, authority and output semantics. Confirm links work from the source directory used through host discovery. Keep ignores covering retained local configuration/dependencies/output so unrelated files do not become untracked content.

A focused setup change may need native discovery checks; a runtime recipe needs scoped app observation. Record actual coverage and failures externally. Documentation edits do not automatically require a device/model request. Source tests/builds are run in their own selected Core workspace, not BART.

Keep no compatibility shims for obsolete BART commands or schemas. Do not overwrite unknown local work or erase ignored files as incidental cleanup. Update [the plan](plan.md) with demonstrated capabilities and real gaps, not a claimed pass based only on process exit.
