# Publish a report with media to GitHub

This is the current procedure for a GitHub comment that includes screenshots, videos or a context ZIP. It is manual for the media step because no supported command-line route attaches files to a comment. Replace it if one becomes available. Posting still follows the user's request and [publication](reporting.md#publication) rules.

## Why the media step is manual

`gh issue comment` posts text only. Attachment URLs (`github.com/user-attachments/...`) come from the GitHub web editor when a person drags or pastes a file into a comment box. Do not use undocumented upload endpoints. Posting text first and editing the media in afterward leaves an incomplete public comment and an edit history, so prepare the whole body before posting.

## Procedure

1. **Agent exports a draft.** Write the checked Markdown report with the media as numbered placeholders such as `{{MEDIA-01}}`, and an upload list that matches them. Give each file a name that starts with its number and says what it shows. Include the context ZIP in the list, with its own placeholder. Run the [export privacy helper](export-privacy.md) `comment` operation on the draft and `check` on the media and ZIP.
2. **The user uploads the files and sends back the URLs.** The user drags the files into any scratch comment box on GitHub, does not submit, and copies the generated Markdown. The draft is not pasted. The user sends each result to the agent labelled with its file number, such as `01: <img ... />`. Dragging the files in list order keeps the box readable but is not required.
3. **Agent finalizes and posts.** Map each URL to its placeholder by label, then apply the formatting below, re-run the privacy `comment` check on the final text and post it with `gh issue comment --body-file`, or hand the text back if the user prefers to submit it. Confirm the posted URL and re-read the body with `gh api` to confirm the check passed on what was posted.

Stop and ask when a number is missing or duplicated, when the type of a pasted item does not match its file (image, video or ZIP), or when a pasted image's `width` and `height` differ from the file's pixel size. Pasted images are all named “Image”, so the label is the only mapping.

If the comment was already posted without media, patch it in place with `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id>` after the same finalization, and keep the previous body for reverting.

## Formatting the final body

- Scale every image with a small `width` attribute and no `height`. Pasted images carry full pixel dimensions (1080, 2410, 2560) and render very large. Starting points: about 230 px for portrait phone and tablet captures and about 420 px for landscape captures. Adjust to the content.
- Group stills in an HTML table with one capture per cell, a short caption under each and a header row per configuration. Keep the configuration and result table from [reporting](reporting.md#configuration-coverage-evidence) for outcomes, with a text label for each piece of evidence, not a link: a link in a table cell stays a plain link and does not preview.
- Put each video outside any table, on its own line, with a label line above it and blank lines around it. GitHub renders an attachment URL as a player only in that position; inside a table cell or beside other text it stays a plain link. A `<video>` tag may render in a cell; check the preview before relying on it.
- Link the context ZIP as a file link with its full filename; it does not render inline.
- Apply [links and identifiers](reporting.md#links-and-identifiers-in-published-text): linked versions in code ticks, commit permalinks and full issue URLs.
- Keep the unofficial BART notice, the outcome headline and the limits where [the summary format](reporting.md#verification-summary-format) puts them.

## Limits

- Mapping depends on the user's labels. The agent can check type and image pixel size but cannot detect two mislabelled videos or two mislabelled images of the same size.
- Attachments uploaded into a comment box that is never submitted may stay on GitHub unreferenced. Whether they resolve before submission is not verified here.
- Rendering of the final comment is not visible to the agent. The user checks the preview or the posted page and reports clips that show as plain links.

## Possible simplification

Hosting the media and ZIP somewhere the agent can upload to would remove the manual upload, the label mapping and the image resizing step. The agent would know every URL and filename before writing the body, set image widths directly and post once with `gh`.

Open points before adopting it:

- GitHub plays a video inline only for its own `user-attachments` URLs, as far as is known. Externally hosted clips would need a scaled thumbnail that links to the file, or a short GIF. This is not verified.
- The host needs access control, retention and deletion handling, because reports on public repositories are public and the privacy check cannot find every sensitive value in pixels.
- It adds infrastructure and credentials to maintain, which this repository does not currently have.

Committing media to a public repository or branch, or using release assets, would let `gh` publish without a new host, but it keeps evidence in repository history.
