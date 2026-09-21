---
name: bart-issue-create
description: Draft a GitHub issue for brave-experiments/bart from the current session, review it in the user's Git editor, and create it with gh only after explicit confirmation.
---

# Create a BART issue

Use the invoking agent's conversation, decisions, observed evidence, and relevant repository files to draft an issue for `brave-experiments/bart`. Example: `$bart-issue-create for the work being done in this session`.

The invoking agent performs this workflow itself. Do not launch Claude, another agent CLI, or a subagent. The output is a GitHub issue, not a new skill. Invocation does not authorize publication: approval comes after the user edits the draft.

## Draft locally

Infer scope from the request and session. Ask only if a missing fact prevents a useful draft. Describe the problem or goal, evidence, proposed work, and completion conditions as appropriate. Distinguish completed work from proposed work, observations from inference, and tested behavior from missing coverage. Do not copy the conversation as the body.

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

Use this editable format, replacing the placeholders:

```markdown
# Title
A concise issue title

# Body
The issue body in Markdown.
```

The first `# Title` and following `# Body` lines delimit the fields and are not published. Require a single nonempty title line and a nonempty body. Everything after the first `# Body` delimiter is the body, including later headings. Keep review instructions outside the file.

## Review in the Git editor

Resolve the editor with `git var GIT_EDITOR` in the BART checkout. Honor its current setting and arguments. The setting observed when this skill was created was `subl --wait`; do not hardcode Sublime or its path.

Launch the configured editor with the draft path as a separately quoted argument. Treat the editor setting as a trusted command, but never interpolate issue text into shell code. Preserve blocking options such as Sublime's `--wait`. If a GUI editor returns before editing ends, use its documented wait option. If no usable editor is configured, ask which editor to use; do not change Git configuration.

Keep the agent turn active while the editor is open. If the command returns a running session ID, wait on that session in bounded intervals until it exits; do not end the turn with “let me know when done” or require another user message to resume. Tell the user to save and close the draft tab: with `subl --wait`, saving alone does not release the editor command. Once the editor exits, read the saved draft and proceed directly to the confirmation below. Saving or closing is not consent to publish. A failed launch, missing file, or invalid title/body returns to local review rather than publication.

Read the saved file, parse the title and body, and preserve the user's edits. Do not silently rewrite them. If edits introduce an unsupported claim or invalid source link, explain it and reopen the draft for correction before approval.

## Confirm and create

Prepare the final title and a UTF-8 body file in the draft directory before asking for approval. Show the destination repository, final title, and final body. Then show the exact proposed `gh issue create` command with the actual title and body-file path safely quoted, and ask:

> Shall I run `gh issue create --repo brave-experiments/bart ...` to create the issue?

Replace the ellipsis with the actual `--title` and `--body-file` arguments. This confirmation should be waiting when the user returns from closing the editor; do not stop at an editor-open status message.

Wait for an explicit affirmative answer. Silence, saving, closing, and an earlier request to draft are not confirmation. Cancellation leaves the draft local. Any change to the title, body, or destination after approval requires renewed review and confirmation.

After confirmation, create exactly one issue with `gh`. This approval authorizes that issue creation as a narrow exception to BART's default read-only GitHub workflow. It does not authorize pushes, comments, labels, assignments, or other remote changes.

Use the prepared body file and pass the approved title as a safely quoted argument:

```sh
gh issue create --repo brave-experiments/bart --title "$issue_title" --body-file "$body_file"
```

Use the exact approved snapshot. Never use issue text as shell code or rebuild the body through shell interpolation. Do not use `--web`, which bypasses this reviewed publication step.

Record and return the issue URL. If the command times out or its result is uncertain, inspect recent issues read-only for the exact approved title and body before retrying. If creation cannot be resolved, stop and report the uncertainty rather than risk a duplicate. Report a definite failure and retain the draft; do not retry publication automatically.
