# Check export privacy

Use `scripts/export_privacy.py` from the real BART checkout to prepare sanitized text copies and check complete QA delivery directories. It requires Python 3.11+ and has no third-party dependencies. Run behavior tests with `python3 -m unittest discover -s scripts -p 'test_*.py'`. This helper does not capture devices or publish reports.

## Configuration and matching

The helper reads BART's ignored `config.toml` by default, independently of cwd. `--config FILE` selects a single alternative file without merging defaults. A missing default file is supported; an explicitly selected missing file or malformed configuration fails. It includes `privacy.blocked_words`, configured Android device IDs and each `--device VALUE` passed for task-selected targets. Do not add real sensitive values to tracked examples or tests.

Values are case-insensitive literal substrings, including punctuation and occurrences within longer strings. Common URL encoding, JSON escaping and fully numeric HTML entity representations are also checked. Arbitrary transformations, mixed encodings, compressed payloads inside text and unknown personal information are not comprehensively detected. Continue reviewing selected content under the existing report privacy rules.

## Prepare and check

```sh
python3 /path/to/bart/scripts/export_privacy.py sanitize \
  --input /private/selected-text --output /private/new-delivery \
  --device "$SERIAL"

python3 /path/to/bart/scripts/export_privacy.py check \
  --input /private/new-delivery --device "$SERIAL" --media-reviewed
```

Sanitization creates a new separate directory only after input validation and replaces text matches with `[REDACTED]`. It preserves originals and filenames. Blocked filenames or directory names stop the operation: choose safe names and update relative links before retrying. The placeholder itself must not match the blocklist. Label derived receipts/media and distinguish original capture hashes from checksums of delivery copies.

Sanitize selected text before packaging ZIPs. The sanitizer does not rewrite ZIPs. The final checker validates ZIP integrity and inspects entry names and decompressed UTF-8 text. Media, nested ZIPs and unsupported formats inside context ZIPs fail. Links, special files, unreadable artifacts, invalid UTF-8, binary text and embedded base64 data fail rather than being skipped. Each artifact and the combined expanded contents of each ZIP are limited to 64 MiB; ZIPs are limited to 10,000 entries. Supported standalone text formats include Markdown, HTML, JSON, XML, logs, CSV, script/source text, TOML, YAML and SVG; unknown extensions fail.

All filenames and directory names, including the selected root path, are checked. Diagnostics use artifact numbers without exposing filenames or matched values. A nonzero exit means the operation did not pass; repair the selected copies and rerun. Keep private task receipts of the selected configuration and reviewed files, without exporting the blocklist itself.

## Media and delivery

Standalone PNG/JPEG/WebP and MP4/WebM/MOV files receive filename and byte/metadata substring checks. Compressed metadata is not fully decoded. Inspect actual images and continuous video for visible sensitive values; `--media-reviewed` acknowledges this caller review and does not perform OCR or establish a visual privacy guarantee. Without that flag, media produces an unresolved finding. Redact delivery copies when necessary without hiding the assessed behavior, and inspect the resulting copies again.

After assembling the report, receipts, media and context ZIP, run `check` on the complete delivery directory. Resolve findings and separately verify relative links and report/media readability using the reporting guidance. Recheck after any change, including packaging. Only deliver or publish the reviewed, checked copies. A passing result covers the configured strings and supported representations, not all possible PII.
