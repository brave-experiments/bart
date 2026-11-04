"""Check a GitHub media publication and post it with gh --attach, using Python 3.11 standard libraries.

The agent writes the body and decides when and where to post. This helper checks the draft,
builds the gh command from explicit arguments and reads the result back. It never chooses a
destination and never publishes during doctor, preflight or verify.

Copyright (c) 2026 The Brave Authors. All rights reserved.
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
https://mozilla.org/MPL/2.0/
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess  # nosemgrep: gitlab.bandit.B404 -- runs only the resolved gh binary, with a list of validated arguments and no shell
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import export_privacy  # noqa: E402

CONFIRMED_GH = (2, 103, 3)
ATTACH_TYPES = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.mov', '.webm'}
VIDEO_TYPES = {'.mp4', '.mov', '.webm'}
MAX_COMMENT_CHARS = 65536
MAX_ATTACHMENTS = 50
# kind -> (gh subcommand words, whether the item body is replaced or a comment is added)
KINDS = {
    'issue-comment': ('issue', 'comment'),
    'pr-comment': ('pr', 'comment'),
    'issue-body': ('issue', 'edit'),
    'pr-body': ('pr', 'edit'),
}
GH_TIMEOUT_SECONDS = 120
REPO = re.compile(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+')
IMAGE = re.compile(r'!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')
LINK = re.compile(r'(?<!!)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')
HTML_SRC = re.compile(r'<(?:img|video|source)\b[^>]*?\bsrc=["\']([^"\']+)["\']', re.I)
ATTACHMENT_URL = re.compile(r'https://github\.com/user-attachments/(?:assets|files)/[A-Za-z0-9-]+')
SCHEME = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//|#|mailto:)', re.I)


def gh_executable():
    found = shutil.which('gh')
    if not found:
        raise RuntimeError('gh is not on PATH.')
    return os.path.realpath(found)


def run_gh(args, *, input_text=None):
    """Run the resolved gh binary with a list of arguments: no shell, no inherited argv[0] lookup."""
    process = subprocess.run([gh_executable(), *map(str, args)], capture_output=True, text=True, input=input_text, shell=False, timeout=GH_TIMEOUT_SECONDS)
    return process.returncode, process.stdout, process.stderr.strip()


def validate_target(repo, *, number=None, comment_id=None):
    """Reject values that could be read as gh flags or alter an API path."""
    if not REPO.fullmatch(repo) or any(part in ('.', '..') or part.startswith('-') for part in repo.split('/')):
        raise ValueError('--repo must look like OWNER/REPO.')
    if number is not None and number < 1:
        raise ValueError('--number must be a positive integer.')
    if comment_id is not None and not re.fullmatch(r'\d+', str(comment_id)):
        raise ValueError('--comment-id must be digits only.')


def parse_gh_version(text):
    match = re.search(r'gh version (\d+)\.(\d+)\.(\d+)', text)
    return tuple(int(part) for part in match.groups()) if match else None


def check(checks, name, status, detail):
    checks.append({'check': name, 'status': status, 'detail': detail})


def finish(checks, **extra):
    ok = all(item['status'] != 'fail' for item in checks)
    return {'ok': ok, 'checks': checks, **extra}


def strip_code(text):
    text = re.sub(r'(^|\n)(`{3,}|~{3,})[^\n]*\n.*?\n\2[^\n]*(?=\n|$)', r'\1', text, flags=re.S)
    return re.sub(r'`[^`\n]*`', '', text)


def local_references(text):
    """Return (images, other_local_links, html_local_sources) for paths outside code."""
    prose = strip_code(text)
    images = [(m.group(1), m.group(2)) for m in IMAGE.finditer(prose) if not SCHEME.match(m.group(2))]
    links = [m.group(1) for m in LINK.finditer(prose) if not SCHEME.match(m.group(1))]
    html_sources = [m.group(1) for m in HTML_SRC.finditer(prose) if not SCHEME.match(m.group(1))]
    return images, links, html_sources


def resolve(body_path, reference):
    relative = Path(reference.split('#', 1)[0])
    for base in (Path(body_path).resolve().parent, Path.cwd()):
        candidate = (base / relative)
        if candidate.is_file():
            return candidate
    return None


def doctor(subcommands):
    checks = []
    if not shutil.which('gh'):
        check(checks, 'gh', 'fail', 'gh is not on PATH.')
        return finish(checks)
    code, out, err = run_gh(['--version'])
    version = parse_gh_version(out)
    if code or not version:
        check(checks, 'gh version', 'fail', 'Could not read the gh version.')
        return finish(checks)
    label = '.'.join(map(str, version))
    confirmed = '.'.join(map(str, CONFIRMED_GH))
    if version < CONFIRMED_GH:
        check(checks, 'gh version', 'warn', f'{label} is older than {confirmed}, the version where --attach was confirmed. The --attach probes below decide.')
    else:
        check(checks, 'gh version', 'pass', f'{label} (confirmed with --attach from {confirmed}).')
    for kind in subcommands:
        words = KINDS[kind]
        code, out, err = run_gh([*words, '--help'])
        if code:
            check(checks, f'--attach on gh {" ".join(words)}', 'fail', err or 'help failed')
        elif '--attach' in out:
            check(checks, f'--attach on gh {" ".join(words)}', 'pass', 'Listed in --help.')
        else:
            check(checks, f'--attach on gh {" ".join(words)}', 'fail', 'Not listed in --help. Update gh, or use the manual fallback in docs/github-publishing.md.')
    code, out, err = run_gh(['auth', 'status'])
    check(checks, 'gh auth', 'pass' if code == 0 else 'fail', 'Authenticated.' if code == 0 else 'Not authenticated. Run gh auth login (the user does this).')
    if sys.version_info < (3, 11):
        check(checks, 'python', 'fail', 'Python 3.11 or newer is required.')
    return finish(checks, ghVersion=label)


def preflight(body_path, *, words, media_dir=None, media_reviewed=False):
    checks = []
    body_path = Path(body_path)
    text = body_path.read_text(encoding='utf-8')
    images, links, html_sources = local_references(text)
    attachments = {}
    for alt, reference in images:
        path = resolve(body_path, reference)
        if path is None:
            check(checks, 'reference', 'fail', f'{reference} does not exist relative to the body file or the working directory.')
        elif path.suffix.lower() not in ATTACH_TYPES:
            check(checks, 'reference', 'fail', f'{reference} is not a type gh --attach accepts ({", ".join(sorted(ATTACH_TYPES))}).')
        else:
            attachments[str(path)] = path
    for reference in links:
        check(checks, 'local link', 'fail', f'{reference} is a link to a local file; gh does not upload or rewrite links. Remove it, or reference an image or video with ![alt](path).')
    for reference in html_sources:
        check(checks, 'html source', 'fail', f'{reference} is a local path in an HTML tag; gh rewrites only Markdown ![alt](path) references. Size images in a second pass after upload.')
    if re.search(r'\{\{MEDIA-?\w*\}\}', text):
        check(checks, 'placeholders', 'fail', 'The body still has {{MEDIA-..}} placeholders.')
    if not images:
        check(checks, 'references', 'warn', 'The body has no local image or video references; nothing will be attached.')
    if len(attachments) > MAX_ATTACHMENTS:
        check(checks, 'attachment count', 'fail', f'{len(attachments)} files exceed the limit of {MAX_ATTACHMENTS} per command.')
    if len(text) > MAX_COMMENT_CHARS:
        check(checks, 'length', 'fail', f'{len(text)} characters exceed GitHub\'s {MAX_COMMENT_CHARS}. Post the context pack as follow-up comments or trim it.')
    if media_dir:
        unreferenced = sorted(p.name for p in Path(media_dir).iterdir() if p.is_file() and p.suffix.lower() in ATTACH_TYPES and str(p.resolve()) not in {str(Path(a).resolve()) for a in attachments})
        if unreferenced:
            check(checks, 'unreferenced media', 'warn', 'Not referenced in the body, so not attached: ' + ', '.join(unreferenced))
    with tempfile.TemporaryDirectory(prefix='bart-gh-publish-') as scratch:
        privacy = export_privacy.export_markdown('comment', words, str(body_path), str(Path(scratch) / 'export'))
        if privacy['findings']:
            check(checks, 'privacy comment check', 'fail', f'{len(privacy["findings"])} finding(s); run export_privacy.py comment for details.')
        else:
            check(checks, 'privacy comment check', 'pass', 'No findings.')
        if media_dir:
            media = export_privacy.inspect_export(str(media_dir), words, media_reviewed=media_reviewed)
            if media['findings']:
                check(checks, 'privacy media check', 'fail', f'{len(media["findings"])} finding(s); run export_privacy.py check for details. Pass --media-reviewed only after inspecting the media.')
            else:
                check(checks, 'privacy media check', 'pass', 'No findings.')
    if not any(item['status'] == 'fail' for item in checks):
        check(checks, 'draft', 'pass', f'{len(attachments)} file(s) to attach; {len(text)} characters.')
    videos = sum(1 for p in attachments.values() if p.suffix.lower() in VIDEO_TYPES)
    return finish(checks, attachments=sorted(attachments), expected={'attachments': len(attachments), 'videos': videos, 'characters': len(text)})


def build_command(kind, repo, number, body_path, attachments, edit_last):
    words = list(KINDS[kind])
    command = [*words, str(number), '-R', repo, '--body-file', str(Path(body_path).resolve())]
    if edit_last:
        command.append('--edit-last')
    for path in attachments:
        command += ['--attach', path]
    return command


def comment_id_from(output):
    match = re.search(r'#issuecomment-(\d+)', output)
    return match.group(1) if match else None


def fetch_item(repo, *, comment_id=None, issue=None, pr=None):
    if comment_id:
        path = f'repos/{repo}/issues/comments/{comment_id}'
    elif issue:
        path = f'repos/{repo}/issues/{issue}'
    else:
        path = f'repos/{repo}/pulls/{pr}'
    code, out, err = run_gh(['api', '-H', 'Accept: application/vnd.github.full+json', path])
    if code:
        raise RuntimeError(f'gh api failed: {err}')
    data = json.loads(out)
    return data.get('body') or '', data.get('body_html') or ''


def verify(repo, *, expected, words, comment_id=None, issue=None, pr=None):
    checks = []
    body, rendered = fetch_item(repo, comment_id=comment_id, issue=issue, pr=pr)
    urls = ATTACHMENT_URL.findall(body)
    unique = list(dict.fromkeys(urls))
    want = expected['attachments']
    check(checks, 'attachment URLs', 'pass' if len(unique) == want else 'fail', f'{len(unique)} found, {want} expected.')
    images, links, html_sources = local_references(body)
    stray = [r for _, r in images] + links + html_sources
    check(checks, 'local paths', 'pass' if not stray else 'fail', 'None left.' if not stray else 'Still present: ' + ', '.join(stray))
    check(checks, 'placeholders', 'fail' if re.search(r'\{\{MEDIA-?\w*\}\}', body) else 'pass', 'Checked for {{MEDIA-..}}.')
    check(checks, 'length', 'pass' if len(body) <= MAX_COMMENT_CHARS else 'fail', f'{len(body)} characters.')
    video_count = len(re.findall(r'<video\b', rendered))
    if rendered:
        status = 'pass' if video_count >= expected.get('videos', 0) else 'fail'
        check(checks, 'rendered videos', status, f'{video_count} <video> element(s), at least {expected.get("videos", 0)} expected. A video that shows as a plain link needs its own line with blank lines around it.')
        sized = len(re.findall(r'<img\b[^>]*\bwidth=', rendered))
        total = len(re.findall(r'<img\b', rendered))
        check(checks, 'rendered images', 'pass', f'{total} <img> element(s), {sized} with a width attribute.')
    with tempfile.TemporaryDirectory(prefix='bart-gh-publish-') as scratch:
        posted = Path(scratch) / 'posted.md'
        posted.write_text(body, encoding='utf-8')
        privacy = export_privacy.export_markdown('comment', words, str(posted), str(Path(scratch) / 'export'))
        check(checks, 'privacy comment check', 'fail' if privacy['findings'] else 'pass', f'{len(privacy["findings"])} finding(s) in the posted text.')
    return finish(checks, urls=unique)


def add_privacy_args(parser):
    parser.add_argument('--config')
    parser.add_argument('--device', action='append', default=[])


def load_words(args):
    config = args.config or Path(__file__).resolve().parent.parent / 'config.toml'
    return export_privacy.load_blocked_words(config, args.device, optional=args.config is None)


def target_args(parser):
    parser.add_argument('--repo', required=True, help='OWNER/REPO that holds the item.')
    parser.add_argument('--kind', required=True, choices=sorted(KINDS))
    parser.add_argument('--number', required=True, type=int, help='Issue or PR number.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='operation', required=True)
    p = sub.add_parser('doctor', help='Check gh, --attach support and authentication.')
    p.add_argument('--kind', action='append', choices=sorted(KINDS), help='Only probe this target kind. Repeatable. Default: all.')
    p = sub.add_parser('preflight', help='Check a draft body and its media. Read-only.')
    p.add_argument('--body-file', required=True)
    p.add_argument('--media-dir')
    p.add_argument('--media-reviewed', action='store_true')
    add_privacy_args(p)
    p = sub.add_parser('post', help='Run preflight, post with gh --attach, then verify. Publishes.')
    target_args(p)
    p.add_argument('--body-file', required=True)
    p.add_argument('--media-dir')
    p.add_argument('--media-reviewed', action='store_true')
    p.add_argument('--edit-last', action='store_true', help='Edit your last comment on the item (comment kinds only).')
    p.add_argument('--show-command', action='store_true', help='Print the gh command and exit without running anything.')
    add_privacy_args(p)
    p = sub.add_parser('verify', help='Read a posted item back and check the media. Read-only.')
    p.add_argument('--repo', required=True)
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument('--comment-id')
    group.add_argument('--issue', type=int)
    group.add_argument('--pr', type=int)
    p.add_argument('--body-file', help='The draft that was posted; sets the expected counts.')
    p.add_argument('--expect-attachments', type=int)
    p.add_argument('--expect-videos', type=int, default=None)
    add_privacy_args(p)
    args = parser.parse_args(argv)
    try:
        if args.operation == 'doctor':
            result = doctor(args.kind or sorted(KINDS))
        elif args.operation == 'preflight':
            result = preflight(args.body_file, words=load_words(args), media_dir=args.media_dir, media_reviewed=args.media_reviewed)
        elif args.operation == 'post':
            validate_target(args.repo, number=args.number)
            if args.edit_last and not args.kind.endswith('-comment'):
                raise ValueError('--edit-last applies to comment kinds only.')
            words = load_words(args)
            result = preflight(args.body_file, words=words, media_dir=args.media_dir, media_reviewed=args.media_reviewed)
            if result['ok']:
                command = build_command(args.kind, args.repo, args.number, args.body_file, result['attachments'], args.edit_last)
                result['command'] = ['gh', *command]
                if not args.show_command:
                    found = doctor([args.kind])
                    if not found['ok']:
                        result = found
                    else:
                        code, out, err = run_gh(command)
                        result['ghExitCode'] = code
                        if code:
                            result['ok'] = False
                            result['error'] = err
                        else:
                            result['url'] = out.strip().splitlines()[-1] if out.strip() else ''
                            comment_id = comment_id_from(out)
                            if args.kind.endswith('-comment') and not comment_id:
                                raise RuntimeError('Posted, but the comment id was not in the gh output; verify by id.')
                            target = {'comment_id': comment_id} if comment_id else ({'issue': args.number} if args.kind == 'issue-body' else {'pr': args.number})
                            result['verify'] = verify(args.repo, expected=result['expected'], words=words, **target)
                            result['ok'] = result['verify']['ok']
        else:
            validate_target(args.repo, number=args.issue or args.pr, comment_id=args.comment_id)
            expected = {'attachments': args.expect_attachments or 0, 'videos': args.expect_videos or 0}
            if args.body_file:
                expected = preflight(args.body_file, words=load_words(args))['expected']
            elif args.expect_attachments is None:
                raise ValueError('Give --body-file or --expect-attachments.')
            result = verify(args.repo, expected=expected, words=load_words(args), comment_id=args.comment_id, issue=args.issue, pr=args.pr)
        print(json.dumps(result, indent=2))
        return 0 if result['ok'] else 1
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'ok': False, 'error': str(error)}, indent=2))
        return 2


if __name__ == '__main__':
    sys.exit(main())
