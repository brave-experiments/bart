# Text-only report context attachment

For a requested published QA report, prepare a text-only context ZIP alongside separately attached screenshots/videos. It lets another agent inspect how checks were performed, repeat the workflow and assess the retained results independently. Prepare the same ZIP for a local QA report intended for later publication; a short session answer or local development summary does not automatically need one. Creating the attachment does not require a new live replay or new executable helpers.

A requested [development QA evidence pack](develop.md#requested-qa-evidence-pack) includes this export even when all output stays local. Identify the selected Core starting/final revisions, relevant task diff, actual changed-build identity, commands/test inputs and observed validation; do not imply a published commit permalink exists for local-only work.

A requested [technical-review evidence pack](review.md) uses the same text-only export. Include pinned reviewed/tested revisions, experiment expectations/results, authored fixture manifests/source, exact load/invocation steps and relevant sanitized diagnostics. Use `bart-review-context-` instead of `bart-context-` for its filename; the remaining target and UTC timestamp convention is unchanged. Do not include binary fixtures/media or imply an unexecuted fixture reproduced a finding.

## Name and layout

Use this filename, naming the PR or issue being assessed rather than the repository receiving a development report:

```text
bart-context-<pr|issue>-<number>-<UTC-YYYYMMDDTHHMM>.zip
```

For example, using illustrative values:

```text
bart-context-pr-40563-20261013T0915.zip
```

The timestamp is the archive creation time in UTC to the minute; the repository and build identity belong in the README inside the archive. The archive contains one top-level directory matching its basename without `.zip`. Create it with the [export privacy helper](export-privacy.md#context-zip) `package` operation rather than by hand. Save it alongside the report and link the exact filename in the report's Context attachment section.

## Useful contents

At minimum, include `README.md` explaining the assessed target, scope, build/device make/model, available [agent execution context](reporting.md#assessment-and-investigation), prerequisites, how to repeat meaningful checks, original observations/limits and how to find the separate media. Organize additional files only when they exist and help continuation:

Include the [human-readable reproduction guide](reporting.md#human-readable-overview-and-reproduction), observed reproduction difficulty and any necessary custom fixture/script source, invocation and dependencies. A command log alone is not an adequate guide. Mark failed or unestablished user triggers separately from successful source/resource checks.

| Contents | Purpose |
| --- | --- |
| `original-attempt.md` or concise report text | Actual conditions, results, failures/omissions and relevant timestamps, distinct from future instructions. |
| `commands.md`, execution JSON or a task-specific `SKILL.md` | Specific Androperator/ADB commands, adaptive actions, parameter placeholders and restoration steps used for the checks. Describe commands not retained exactly as such; do not invent a transcript. |
| Local test inputs/helper source | HTML fixtures, scripts, text inputs or test files actually written/used; include invocation and necessary dependencies. No need to author a helper just for the archive. |
| Relevant source/context extracts | Source links/revisions, issue/PR expectations and concise facts needed to interpret/reproduce the check. |
| Sanitized text receipts | Useful API results, raw hierarchy XML, build/install metadata, hashes and measured observations supporting the report. Select relevant receipts, not an entire daily log or session transcript. |
| Recipe/tool-usage notes | Useful discovered routes, Androperator gaps and fallback details that affect repetition. |
| `media-index.md` | Separate attachment URLs/filenames, capture labels, timestamps and hashes when available, so observations can be matched to the report's media. |

Separate future-attempt instructions from historical verdicts. Another agent must reacquire mutable state and independently assess observations, not inherit the original pass. A context ZIP need not be a formally authored reproduction skill; [reproduction guidance](reproduction.md) applies when it contains one.

## Exclusions and privacy

Include only reviewed text-based files. Exclude APKs, images, videos, audio, binary test outputs, dependency trees, caches and embedded/base64 media. Text source such as HTML may be included as a test fixture or report copy only without embedded media; media stays separately attached. Do not ZIP the entire task directory.

Follow [report privacy](reporting.md#assessment-and-investigation): remove device serials, credentials, account/session identifiers and unrelated personal data from every file, including XML/JSON, paths and commands. Use placeholders for target serials and machine paths; retain device make/model and relevant Android/build details. Keep original private receipts separately. If a sanitized file's bytes change, its original capture hash is historical provenance, not a checksum of the exported file; label that distinction.

## Check and deliver

Inspect the selected staging directory and ZIP file listing, ensure all files are text, review privacy and confirm relative instructions/dependencies resolve. Verify archive integrity and extract it into a temporary directory to read the entrypoint and relevant links. Keep it compact by selecting useful context; compression alone does not make excessive logs manageable. Respect the destination's current attachment-size limit and report a precise delivery gap rather than silently omit essential context.

Run the [export privacy helper](export-privacy.md) on the final delivery directory, including the ZIP. It checks archive entry filenames and decompressed text; a compressed-byte search alone is insufficient.

Link the archive from local HTML. For requested GitHub publication, attach it through the supported archive-upload route and link the confirmed attachment URL; a media-only CLI upload route may require a browser or human handoff for ZIPs. Do not invent an upload API. After upload, retain a local publication receipt mapping the archive/media to their URLs; provide the association in the posted report. Keep app assessment and attachment/publication completion separate.

If context is limited because commands, receipts or test inputs were not retained, state that in README and the report. Do not rerun device actions just to manufacture missing history. Package inspection verifies portability of files, not successful live reproduction; report a fresh replay only when separately requested and actually performed.
