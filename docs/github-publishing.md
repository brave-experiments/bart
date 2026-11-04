# Publish a report with media to GitHub

This is the procedure for a GitHub issue, PR or comment that includes screenshots, videos and the report's context. It is expected to run end to end from the agent with no human upload step: images and videos go up with `gh --attach`, and the context pack is inlined in the same text as collapsed `<details>` blocks. Do not ask the user to drag files into a browser unless the client lacks `--attach` (see the [fallback](#fallback-client-without---attach)). Posting still follows the user's request and [publication](reporting.md#publication) rules. Uploading is publication, so it needs the same authority as posting.

## Check the client

Run `gh --version`, then check the subcommand you will use:

```
gh pr edit --help | grep -i attach
```

`--attach` was confirmed in the help of `gh` 2.103.3 for `pr edit`, `pr comment`, `issue edit` and `issue comment`. Probe the installed client instead of assuming; an older client may lack it. Each flag takes `<file>#<alt text>`, may repeat, and accepts up to 50 files per command. Supported types are png, jpg, jpeg, gif, webp, svg, mp4, mov and webm; the client rejects a ZIP with "not a supported file type". Do not try to upload the context ZIP; inline its contents as described in [context pack in the comment](#context-pack-in-the-comment).

## Procedure

1. **Prepare the draft.** Write the checked Markdown body with each image as `![alt](./NN-name.png)`, where the path is the real file and `NN-name` starts with its number and says what it shows. Run the [export privacy helper](export-privacy.md) `comment` (or `pr`) operation on the draft and `check` on the media and ZIP. Reference each video the same way as an image; `gh` rewrites it to a bare attachment URL on its own line, which GitHub renders as a player.
2. **Publish once.** Pass the draft and every file in one command, with alt text after `#`:
   ```
   gh pr edit <number> --body-file body.md \
     --attach "01-light.png#Light theme, Dynamic colors on" \
     --attach "02-dark.png#Dark theme, Dynamic colors on"
   ```
   For a new PR, create it as a draft first with `gh pr create --draft --body-file`, then attach with `gh pr edit`, since `pr create` has no `--attach`. For an item comment use `gh issue comment` or `gh pr comment` with `--body-file` and `--attach`. Use explicit repository and item selections.
3. **Verify the body.** Read it back (`gh pr view <number> --json body -q .body`, or `gh api` for a comment) and confirm:
   - the count of `github.com/user-attachments` URLs equals the number of attached files;
   - no `./…` local paths remain;
   - no attached copy was appended at the bottom that duplicates a placed one;
   - the PR is still a draft where required;
   - the privacy `comment` check passes on the posted text.
4. **Fix a wrong body in place.** Edit with the corrected `--body-file`. Keep the previous body for reverting. If an upload partly failed, `gh` still updates the item, so re-attach only the missing files and re-verify.

## How `gh` rewrites the body

`gh` replaces only Markdown image references, `![alt](./file.png)`, whose path matches an attached file. Other forms are left as written:

- An `<img src="./file.png">` tag stays a local path.
- Any attached file the body does not reference is appended to the end as `![alt](https://github.com/user-attachments/assets/…)`.

This matters when you need a fixed image width, which only the `<img>` form supports. Use one of these routes:

- **Accept default sizing.** Reference images with `![alt](./file.png)`. Full-size images may render very large.
- **Two passes for sized images.** Attach with `![alt](./file.png)` references, read the body back, replace each returned `user-attachments` URL into an `<img src="…" width="…" alt="…">` tag, delete the appended copies, and apply with `gh … edit --body-file`. Re-run step 3.

## Context pack in the comment

Publish the [context pack](report-context.md) as text in the same comment, after the media, under a `#### Context attachment` heading. Use one collapsed block per file:

```
<details>
<summary>Commands used</summary>

<file contents as Markdown, or a code fence for source files>

</details>
```

Leave a blank line after `<summary>` and before `</details>` so the content renders as Markdown. Use code fences for fixture or helper source. Include the README with the reproduction guide, the original attempt and limits, the commands, the build identity receipt, the Androperator usage notes and any fixture source. Skip files whose only use is local, such as media hashes.

Run the privacy `comment` check on the final text, which covers the inlined files. The whole comment must stay under GitHub's 65,536-character limit. If it will not fit, post the full pack as follow-up comments of the same kind and link them from the first, or trim the fixture and notes; do not drop the README or the original attempt. A ZIP is still built for local reports and handoff, but it is not part of the published result.

## Formatting the final body

- Scale every image with a small `width` attribute and no `height`. Starting points: about 230 px for portrait phone and tablet captures and about 420 px for landscape captures. Adjust to the content.
- Group stills in an HTML table with one capture per cell, a short caption under each and a header row per configuration. Keep the configuration and result table from [reporting](reporting.md#configuration-coverage-evidence) for outcomes, with a text label for each piece of evidence, not a link: a link in a table cell stays a plain link and does not preview.
- Put each video outside any table, on its own line, with a label line above it and blank lines around it. GitHub renders an attachment URL as a player only in that position. A `<video>` tag may render in a cell; check the preview before relying on it. After posting, `gh api -H "Accept: application/vnd.github.full+json" repos/<owner>/<repo>/issues/comments/<id> -q .body_html` shows whether each video became a `<video>` element and each image kept its `width`.
- Apply [links and identifiers](reporting.md#links-and-identifiers-in-published-text): linked versions in code ticks, commit permalinks and full issue URLs.
- Keep the unofficial BART notice, the outcome headline and the limits where [the summary format](reporting.md#verification-summary-format) puts them.

## Fallback: client without `--attach`

Use this only when the installed `gh` lacks `--attach` and cannot be updated within the task's scope. `gh` cannot upload files here, and undocumented upload endpoints are not used. Posting text first and adding media afterward leaves an incomplete public comment and an edit history, so prepare the whole body before posting.

1. **Agent exports a draft.** Use numbered placeholders such as `{{MEDIA-01}}` for media and a matching upload list, with the same file naming and privacy checks as above. The context pack is still inlined.
2. **The user uploads the files and sends back the URLs.** The user drags the files into any scratch comment box on GitHub, does not submit, and copies the generated Markdown. The draft is not pasted. The user sends each result to the agent labelled with its file number, such as `01: <img ... />`.
3. **Agent finalizes and posts.** Map each URL to its placeholder by label, apply the formatting above, re-run the privacy `comment` check and post with `gh issue comment --body-file`, or hand the text back if the user prefers to submit it. Confirm the posted URL and re-read the body with `gh api`.

Stop and ask when a number is missing or duplicated, when the type of a pasted item does not match its file, or when a pasted image's `width` and `height` differ from the file's pixel size. Pasted images are all named “Image”, so the label is the only mapping. A comment already posted without media can be patched with `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id>`.

## Limits

- Verified on an issue comment (`gh` 2.103.3, `brave-experiments/bart`): six mp4 clips and eight png stills attached in one `gh issue comment --attach` call; all 14 references were rewritten, none were left as local paths, the rendered HTML had six `<video>` elements, and a following `gh issue comment --edit-last --body-file` pass set `width="230"` on the table images. The same run showed that a ZIP is rejected.
- Verified: six `<details>` blocks holding the context README, notes, commands, receipt and fixture source (22,317 characters in total with the report) rendered correctly beside the attached media.
- Not verified here: `--attach` on `pr create`, `pr comment` and `issue edit` in practice (only the help text was checked for the last two), and a ZIP upload by any command-line route.
- Public-repository attachments are accessible publicly; select task-appropriate evidence.
- The agent cannot see the rendered page. Check the preview or posted page, or ask the user to report clips that show as plain links.
- In the fallback, mapping depends on the user's labels; two mislabelled videos or same-size images cannot be detected.
