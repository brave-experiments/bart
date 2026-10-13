# Text-only report context attachment

For a requested published QA report, prepare a text-only context ZIP alongside separately attached screenshots/videos. It lets another agent inspect how checks were performed, repeat the workflow and assess the retained results independently. Prepare the same ZIP for a local QA report intended for later publication; a short session answer or local development summary does not automatically need one. Creating the attachment does not require a new live replay or new executable helpers.

## Name and layout

Use this filename, with the source target being assessed rather than the repository receiving a development report:

```text
bart-qa-context--<owner>-<repo>--<pr|issue>-<number>--<build-label>--<UTC-YYYYMMDDTHHMMSSZ>--<uuid>.zip
```

For example, using illustrative values:

```text
bart-qa-context--brave-brave-core--pr-40563--nightly-1.99.35--20261013T091500Z--6f68d4af-0916-4a6e-bcd3-2d573d576916.zip
```

Generate a new UUID for each export; record the archive creation time in UTC. Use lowercase filesystem-safe labels without paths, spaces, personal names or device serials. Use `build-unknown` or `multi-build` when appropriate, with actual identities explained inside. The archive contains one top-level directory matching its basename without `.zip`. Save it alongside the report and link the exact filename in the report's Context attachment section.

## Useful contents

At minimum, include `README.md` explaining the assessed target, scope, build/device make/model, available [agent execution context](reporting.md#assessment-and-investigation), prerequisites, how to repeat meaningful checks, original observations/limits and how to find the separate media. Organize additional files only when they exist and help continuation:

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

Link the archive from local HTML. For requested GitHub publication, attach it through the supported archive-upload route and link the confirmed attachment URL; a media-only CLI upload route may require a browser or human handoff for ZIPs. Do not invent an upload API. After upload, retain a local publication receipt mapping the archive/media to their URLs; provide the association in the posted report. Keep app assessment and attachment/publication completion separate.

If context is limited because commands, receipts or test inputs were not retained, state that in README and the report. Do not rerun device actions just to manufacture missing history. Package inspection verifies portability of files, not successful live reproduction; report a fresh replay only when separately requested and actually performed.
