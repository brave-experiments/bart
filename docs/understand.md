# Understand an issue, PR or behavior

Establish enough intended behavior, implementation context and conditions to choose the next useful action. A brief answer may need one source read; a timing bug may need code and app investigation. Use sufficient conversation and historical sources directly, identifying their limits.

## Research that affects the task

- Read the issue/PR body and relevant comments, linked issues, QA expectations and review threads. Follow links that change interpretation or setup, not every reference. Paginate lists when later discussion could matter.
- For a PR, inspect its diff, base/head and merge revision when present, plus relevant tests and surrounding code. Review approval, closure and successful CI are context, not runtime proof.
- Attribute reported behavior to its source. Issue/QA/design expectations establish intended behavior; code explains mechanism and conditions, not automatically correctness.
- Trace feature gates, settings, lifecycle, theme/resource inheritance, native services or timing beyond the diff when needed. A visible symptom may have a different cause than the first matching label.
- Keep useful source URLs, revisions and failed reads in task notes. Save raw material when needed to support a disputed claim or continuation; a source index/schema is not required.

Use the host's authorized GitHub read tools, normally `gh`. Consult current issue/PR view and API help; list comments/reviews separately when needed. Research access does not imply publication.

For feature/regression expectations beyond the issue, consult the relevant [QA resources](qa-resources.md) section. Check actual platform/content and currency before adopting a check; avoid expanding a scoped request into a release-wide checklist.

## Source revisions and tests

Read pinned local Git objects without switching a working checkout just to inspect history:

```sh
git -C "$CORE_DIR" show <full-sha>:<repository-relative-path>
```

If an object is absent, retain the failure and use an authorized remote read at that revision. Record the current checkout separately; do not silently substitute it. Core's pinned package/DEPS identify required Chromium dependencies; a current parent tree may be only a comparison to the historical revision.

Inspect what existing test assertions actually establish. An internal race test can exercise a precise condition that ordinary gestures cannot reproduce. Bound exploratory retries, and state whether the trigger was observed or inferred. Build selection and rollout/runtime identity belong in [builds](builds.md) and [verify](verify.md).

## Decide what to do next

When the next uncertainty depends on current UI, site, account, build or timing state, observe it rather than expand a paper plan. Return to research when the observation changes the hypothesis. Keep unknowns and contradictory reports visible; do not require a research package before app work.

A useful understanding result names the likely implementation area, intended behavior, decisive prerequisites, next checks and uncertainty. It supplies expectations for a future attempt, not a device verdict. If reporting is the requested endpoint, use [reporting](reporting.md).
