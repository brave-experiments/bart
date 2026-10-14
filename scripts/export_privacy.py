"""Check QA delivery contents and filenames using Python 3.11 standard libraries.

Copyright (c) 2026 The Brave Authors. All rights reserved.
This Source Code Form is subject to the Mozilla Public License, v. 2.0.
https://mozilla.org/MPL/2.0/
"""
import argparse
import datetime
import html
import io
import json
from pathlib import Path
import re
import shutil
import stat
import sys
import tempfile
import tomllib
import uuid
from urllib.parse import quote
import zipfile

TEXT = {'.md', '.txt', '.html', '.htm', '.json', '.xml', '.log', '.csv', '.py', '.ts', '.js', '.mjs', '.css', '.sh', '.toml', '.yaml', '.yml', '.svg', '.diff', '.patch'}
MEDIA = {'.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm', '.mov'}
MAX_BYTES = 64 * 1024 * 1024


class PrivateArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        self.exit(2, 'Invalid privacy arguments. Use --help for usage. Sensitive details withheld.\n')


def load_blocked_words(config_path, devices=(), optional=False):
    try:
        with Path(config_path).open('rb') as handle:
            config = tomllib.load(handle)
    except FileNotFoundError:
        if not optional:
            raise ValueError('Selected configuration is missing.') from None
        config = {}
    for table in ('privacy', 'android'):
        if not isinstance(config.get(table, {}), dict):
            raise ValueError('Configuration section must be a table.')
    words = config.get('privacy', {}).get('blocked_words', [])
    if not isinstance(words, list):
        raise ValueError('privacy.blocked_words must be an array.')
    android = config.get('android', {})
    values = words + [android[key] for key in ('device_id', 'phone_device_id', 'tablet_device_id') if key in android] + list(devices)
    if any(not isinstance(value, str) or not value.strip() for value in values):
        raise ValueError('Blocked values must be nonempty strings.')
    return list(dict.fromkeys(value for value in values if not re.fullmatch(r'<[^>]+>', value)))


class Matcher:
    def __init__(self, words):
        variants = set()
        for word in words:
            variants.update((word, quote(word, safe=''), html.escape(word, quote=True), json.dumps(word, ensure_ascii=True)[1:-1]))
            variants.add(''.join(f'&#{ord(char)};' for char in word))
            variants.add(''.join(f'&#x{ord(char):x};' for char in word))
            variants.add(''.join(f'\\u{ord(char):04x}' for char in word))
        self.expression = re.compile('|'.join(re.escape(value) for value in sorted(variants, key=len, reverse=True)), re.IGNORECASE) if variants else None

    def contains(self, value):
        return bool(self.expression and self.expression.search(value))

    def redact(self, value):
        return self.expression.sub('[REDACTED]', value) if self.expression else value


def inspect_export(root, words, *, sanitize_to=None, media_reviewed=False):
    match = Matcher(words)
    if match.contains('[REDACTED]'):
        raise ValueError('Blocklist conflicts with redaction placeholder.')
    source = Path(root).absolute()
    output = Path(sanitize_to).absolute() if sanitize_to else None
    if source.is_symlink() or not source.is_dir():
        raise ValueError('Input must be a real directory.')
    if output and (source.resolve() in (output.resolve(), *output.resolve().parents) or output.resolve() in source.resolve().parents):
        raise ValueError('Source and destination must be separate.')
    findings, copies = [], []
    count = media_count = 0

    def fail(identifier, reason):
        findings.append({'artifact': identifier, 'reason': reason})

    def inspect_bytes(name, data, identifier, in_archive=False):
        nonlocal media_count
        extension = Path(name).suffix.lower()
        if extension == '.zip' and not in_archive and output is None:
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    entries = archive.infolist()
                    if sum(entry.file_size for entry in entries) > MAX_BYTES or len(entries) > 10000:
                        raise ValueError('Archive exceeds limits.')
                    names = set()
                    for index, entry in enumerate(entries, 1):
                        entry_id = f'{identifier}:entry-{index}'
                        if match.contains(entry.filename):
                            fail(entry_id, 'Blocked value in archive filename.')
                        if entry.filename in names:
                            fail(entry_id, 'Duplicate archive entry.')
                        names.add(entry.filename)
                        if '\\' in entry.filename or entry.filename.startswith('/') or '..' in entry.filename.split('/') or stat.S_ISLNK(entry.external_attr >> 16):
                            fail(entry_id, 'Unsafe archive entry.')
                        if not entry.is_dir():
                            with archive.open(entry) as handle:
                                content = handle.read(MAX_BYTES + 1)
                                if len(content) > MAX_BYTES:
                                    raise ValueError('Archive entry exceeds limit.')
                            inspect_bytes(entry.filename, content, entry_id, True)
            except (OSError, ValueError, RuntimeError, zipfile.BadZipFile, NotImplementedError):
                fail(identifier, 'Cannot validate archive.')
            return data
        if extension in MEDIA and not in_archive:
            media_count += 1
            if match.contains(data.decode('latin1')) or match.contains(data.decode('utf-8', errors='replace')):
                fail(identifier, 'Blocked value in media bytes or metadata.')
            if not media_reviewed:
                fail(identifier, 'Media requires visual review of blocked values.')
            return data
        if extension not in TEXT:
            fail(identifier, 'Unsupported artifact type.')
            return data
        try:
            text = data.decode('utf-8')
        except UnicodeError:
            fail(identifier, 'Invalid UTF-8 text.')
            return data
        if '\0' in text:
            fail(identifier, 'Binary content in text artifact.')
        if re.search(r'data:[^\s\"\'<>]*;base64,', text, re.IGNORECASE):
            fail(identifier, 'Embedded base64 content must be removed.')
        if match.contains(text) and output is None:
            fail(identifier, 'Blocked value in text.')
        return (match.redact(text) if output else text).encode('utf-8')

    def walk(directory):
        nonlocal count
        for item in sorted(directory.iterdir()):
            count += 1
            identifier = f'artifact-{count}'
            relative = item.relative_to(source)
            if match.contains(str(relative)):
                fail(identifier, 'Blocked value in filename or directory name.')
            if item.is_symlink():
                fail(identifier, 'Links are unsupported.')
            elif item.is_dir():
                walk(item)
                copies.append((relative, None))
            elif item.is_file():
                try:
                    if item.stat().st_size > MAX_BYTES:
                        fail(identifier, 'Artifact exceeds 64 MiB limit.')
                        continue
                    data = inspect_bytes(str(relative), item.read_bytes(), identifier)
                    copies.append((relative, data))
                except OSError:
                    fail(identifier, 'Cannot read artifact.')
            else:
                fail(identifier, 'Special files are unsupported.')

    if match.contains(str(source)) or match.contains(str(source.resolve())) or (output and (match.contains(str(output)) or match.contains(str(output.resolve())))):
        fail('root', 'Blocked value in source or delivery path.')
    walk(source)
    if not findings and output:
        output.mkdir()
        for relative, data in copies:
            target = output / relative
            if data is None:
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open('xb') as handle:
                    handle.write(data)
    return {'findings': findings, 'mediaCount': media_count, 'filesChecked': count}


def export_markdown(operation, words, body, output, title=None):
    """Write GitHub-ready Markdown to a new directory only if it passes the privacy check."""
    if operation == 'pr':
        title = (title or '').strip()
        if not title or len(title) > 256 or '\n' in title or '\r' in title:
            raise ValueError('PR title must be one nonempty line of at most 256 characters.')
    elif title is not None:
        raise ValueError('Title applies only to PR exports.')
    text = Path(body).read_text(encoding='utf-8')
    if not text.strip():
        raise ValueError('Body is empty.')
    files = {'pr-title.txt': title + '\n', 'pr-body.md': text} if operation == 'pr' else {'comment.md': text}
    destination = Path(output).absolute()
    if destination.exists():
        raise ValueError('Output must not exist.')
    with tempfile.TemporaryDirectory(prefix='bart-export-') as staging:
        for name, content in files.items():
            (Path(staging) / name).write_text(content, encoding='utf-8')
        result = inspect_export(staging, words)
        if Matcher(words).contains(str(destination)) or Matcher(words).contains(str(destination.resolve())):
            result['findings'].append({'artifact': 'root', 'reason': 'Blocked value in delivery path.'})
        if not result['findings']:
            shutil.copytree(staging, destination)
    return result


def package_context(words, source, output_dir, *, kind, repo, target, build, now=None, token=None):
    """Zip a staged text-only context directory under the documented filename, checking the finished archive."""
    prefix = {'qa': 'bart-qa-context', 'review': 'bart-review-context'}[kind]
    owner_repo = repo.lower().replace('/', '-')
    if not re.fullmatch(r'[a-z0-9][a-z0-9._]*-[a-z0-9][a-z0-9._-]*', owner_repo) or repo.count('/') != 1:
        raise ValueError('Repository must be owner/repo.')
    if not re.fullmatch(r'(pr|issue)-[1-9][0-9]*', target):
        raise ValueError('Target must be pr-N or issue-N.')
    if not re.fullmatch(r'[a-z0-9][a-z0-9._-]*', build):
        raise ValueError('Build label must be lowercase letters, digits, dots, underscores or hyphens.')
    stamp = (now or datetime.datetime.now(datetime.timezone.utc)).strftime('%Y%m%dT%H%M%SZ')
    name = f'{prefix}--{owner_repo}--{target}--{build}--{stamp}--{token or uuid.uuid4()}'
    source, output_dir = Path(source).absolute(), Path(output_dir).absolute()
    if not output_dir.is_dir():
        raise ValueError('Output directory must exist.')
    if not (source / 'README.md').is_file():
        raise ValueError('Context needs a top-level README.md.')
    files = sorted(path for path in source.rglob('*') if path.is_file() and not path.is_symlink())
    if any(path.suffix.lower() not in TEXT for path in files):
        raise ValueError('Context ZIPs hold only supported text files; keep media, APKs and archives separate.')
    result = inspect_export(source, words)
    destination = output_dir / f'{name}.zip'
    matcher = Matcher(words)
    if not result['findings'] and (matcher.contains(str(destination)) or matcher.contains(str(destination.resolve()))):
        result['findings'].append({'artifact': 'root', 'reason': 'Blocked value in delivery path.'})
    if result['findings']:
        return result
    with tempfile.TemporaryDirectory(prefix='bart-package-') as staging:
        archive = Path(staging) / destination.name
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as handle:
            for path in files:
                handle.writestr(f'{name}/{path.relative_to(source).as_posix()}', path.read_bytes())
        result = inspect_export(staging, words)
        if not result['findings']:
            shutil.copyfile(archive, destination)
            result['archive'] = destination.name
    return result


def main(argv=None):
    parser = PrivateArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=('check', 'sanitize', 'comment', 'pr', 'package'))
    parser.add_argument('--input')
    parser.add_argument('--body')
    parser.add_argument('--title')
    parser.add_argument('--kind', choices=('qa', 'review'), default='qa')
    parser.add_argument('--repo')
    parser.add_argument('--target')
    parser.add_argument('--build')
    parser.add_argument('--output')
    parser.add_argument('--config')
    parser.add_argument('--device', action='append', default=[])
    parser.add_argument('--media-reviewed', action='store_true')
    args = parser.parse_args(argv)
    try:
        markdown = args.operation in ('comment', 'pr')
        if args.operation == 'package':
            if not (args.input and args.output and args.repo and args.target and args.build) or args.body or args.title:
                raise ValueError('Package requires --input, --output, --repo, --target and --build.')
        elif markdown:
            if not args.output or not args.body or args.input:
                raise ValueError('Markdown exports require --body and --output, not --input.')
        elif not args.input or args.body or args.title or bool(args.output) != (args.operation == 'sanitize'):
            raise ValueError('Output is required only for sanitize.')
        config = args.config or Path(__file__).resolve().parent.parent / 'config.toml'
        words = load_blocked_words(config, args.device, optional=args.config is None)
        if args.operation == 'package':
            result = package_context(words, args.input, args.output, kind=args.kind, repo=args.repo, target=args.target, build=args.build)
        elif markdown:
            result = export_markdown(args.operation, words, args.body, args.output, args.title)
        else:
            result = inspect_export(args.input, words, sanitize_to=args.output, media_reviewed=args.media_reviewed)
        result['scope'] = 'Text, filenames, ZIP entries and media bytes; pixels require caller visual review.'
        print(json.dumps(result, indent=2))
        return 1 if result['findings'] else 0
    except Exception:
        print('Privacy operation failed. Check arguments, configuration and filesystem access. Sensitive details withheld.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
