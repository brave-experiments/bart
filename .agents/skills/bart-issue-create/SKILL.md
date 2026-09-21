---
name: bart-issue-create
description: Draft a GitHub issue for brave-experiments/bart from the current session and open a prefilled GitHub form for the user to edit and submit.
---

# Create a BART issue

Use the invoking agent's conversation, decisions, observed evidence, and relevant repository files to draft an issue for `brave-experiments/bart`. Example: `$bart-issue-create for the work being done in this session`.

The invoking agent performs this workflow itself. Do not launch another agent CLI or a subagent. Draft an issue, then hand it to the user in GitHub. The user edits and submits the form; the agent does not publish it.

## Draft locally

Infer scope from the request and session. Ask only if a missing fact prevents a useful draft. Describe the problem or goal, evidence, proposed work, and completion conditions as appropriate. Distinguish completed work from proposed work, observations from inference, and tested behavior from missing coverage. Do not copy the conversation as the body.

Choose the opening based on the issue's scope and complexity:

- For a larger issue with several parts, substantial context, or technical detail, start the body with `## Executive summary`. In a short plain-English paragraph, explain the problem, why it matters, and the intended outcome so a reader can understand the issue before reading the details. Preserve any qualification needed to keep the summary accurate.
- For a small, focused issue whose body already explains the change in a few direct sentences, omit the executive summary and start with the problem or requested change. Do not add a summary that merely repeats the body.

Use judgment rather than a fixed word count. Include the summary when it helps readers understand the scope; keep supporting evidence and implementation detail below it.

Write Markdown in plain English:

- Preserve every fact, number, name, condition, and qualification.
- Keep code, identifiers, commands, and technical terms unchanged when simpler words would lose precision. Explain unfamiliar terms when needed.
- Use short, familiar words and active voice. Cut words that add no meaning.
- Avoid stock metaphors, jargon used only to sound expert, and achievement language such as “comprehensive,” “robust,” or “perfect” without necessary supporting facts.
- Say what should change and why. Simplify language without losing substance. Prefer clarity and accuracy over any style rule.

Include short, relevant fenced code snippets when useful. Anchor existing code to full commit SHAs already pushed to GitHub, never unpushed local commits or moving branch names:

- Use read-only `gh` queries to resolve a remote branch or PR revision in the source repository and verify the file at that SHA. Local SHAs and remote-tracking refs alone do not prove publication.
- Read snippets from that exact revision and verify their line numbers. Link to `https://github.com/OWNER/REPO/blob/FULL_SHA/path/to/file#Lstart-Lend` in the source repository, which may differ from the issue repository.
- Label proposed code and local changes as proposals. Anchor their existing context to a verified pushed revision; do not imply the proposed code exists there. If no published source supports a link, state that limit. Do not push commits to obtain links.

Store the draft in a unique directory under the configured `BART_WORK_DIR`, outside the checkout, with its case when applicable. If the variable is unset, ask for its location rather than inventing a machine-specific default. Retain drafts after cancellation or failure.

Save a concise, single-line title in `title.txt` and the Markdown body in `body.md`, both as UTF-8. Require both to be nonempty. When resuming an existing draft, preserve the user's saved edits rather than regenerating it from session context. For an older combined draft, split its title and body without changing their text.

## Open GitHub for review

Open the prefilled issue form using the saved title and body:

```sh
gh issue create --repo brave-experiments/bart --web --title "$issue_title" --body-file "$body_file"
```

Pass the title and file path as safely quoted arguments or use a subprocess argument array. Never treat issue text as shell code. Use `--body-file` to preserve Markdown and newlines.

Opening this form is part of the requested workflow and needs no separate confirmation in chat. Do not open the Git editor or wait for an editor process. Always include `--web`; do not fall back to direct issue creation through the CLI or API. Do not click GitHub's submit button on the user's behalf.

Tell the user that the draft is open on GitHub for them to edit and submit. Opening the browser does not prove that an issue was created, so do not report publication or invent an issue URL. End the turn after the handoff; do not poll for submission unless asked.

If the command fails or the form cannot carry the full draft, retain the local files and report the limitation. Give the user the saved title and body and the repository's new-issue page so they can paste them manually. Do not truncate the draft silently or switch to automatic publication.
