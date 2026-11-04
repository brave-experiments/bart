"""Tests use a fake gh executable and synthetic values; they never touch GitHub."""
import io
import json
import os
from contextlib import redirect_stdout
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest import mock

import gh_publish

FAKE_GH = '''#!{python}
import json, os, sys
args = sys.argv[1:]
log = os.environ['FAKE_GH_LOG']
with open(log, 'a') as handle:
    handle.write(json.dumps(args) + '\\n')
if args[:1] == ['--version']:
    print('gh version ' + os.environ.get('FAKE_GH_VERSION', '2.103.3') + ' (2026-10-26)')
elif args[-1:] == ['--help']:
    print('FLAGS\\n  --body-file file' + ('' if os.environ.get('FAKE_NO_ATTACH') else '\\n  --attach file  Attach an image or video'))
elif args[:2] == ['auth', 'status']:
    sys.exit(1 if os.environ.get('FAKE_NO_AUTH') else 0)
elif args[:1] == ['api']:
    print(open(os.environ['FAKE_API_RESPONSE']).read())
else:
    print('https://github.com/o/r/issues/1#issuecomment-99')
'''


class GhPublishTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='bart-gh-publish-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        gh = self.bin / 'gh'
        gh.write_text(FAKE_GH.format(python=sys.executable))
        gh.chmod(gh.stat().st_mode | stat.S_IEXEC)
        self.log = self.root / 'gh.log'
        self.api = self.root / 'api.json'
        patcher = mock.patch.dict(os.environ, {'PATH': f'{self.bin}{os.pathsep}{os.environ["PATH"]}', 'FAKE_GH_LOG': str(self.log), 'FAKE_API_RESPONSE': str(self.api)})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.media = self.root / 'media'
        self.media.mkdir()
        (self.media / 's01.png').write_bytes(b'png')
        (self.media / '01.mp4').write_bytes(b'mp4')
        self.body = self.media / 'body.md'
        self.body.write_text('![Shot](./s01.png)\n\nClip\n\n![Clip](./01.mp4)\n')

    def calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def run_main(self, *args):
        out = io.StringIO()
        with redirect_stdout(out):
            code = gh_publish.main(list(args))
        return code, json.loads(out.getvalue())

    def privacy_config(self, words=()):
        config = self.root / 'config.toml'
        config.write_text('[privacy]\nblocked_words=[' + ','.join(f'"{w}"' for w in words) + ']\n')
        return ['--config', str(config)]

    def statuses(self, result):
        return {item['check']: item['status'] for item in result['checks']}

    def test_version_parsing(self):
        self.assertEqual(gh_publish.parse_gh_version('gh version 2.103.3 (2026-10-26)\nhttps://x'), (2, 103, 3))
        self.assertIsNone(gh_publish.parse_gh_version('nothing'))

    def test_reference_scan_ignores_code_and_urls(self):
        text = '![a](./x.png) ![b](https://h/x.png)\n```\n![c](./code.png)\n```\n`![d](./inline.png)` [f](./doc.zip) <img src="./y.png"> [u](https://h)'
        images, links, sources = gh_publish.local_references(text)
        self.assertEqual(images, [('a', './x.png')])
        self.assertEqual(links, ['./doc.zip'])
        self.assertEqual(sources, ['./y.png'])

    def test_doctor_reports_each_attach_probe(self):
        result = gh_publish.doctor(sorted(gh_publish.KINDS))
        self.assertTrue(result['ok'])
        self.assertEqual(result['ghVersion'], '2.103.3')
        os.environ['FAKE_NO_ATTACH'] = '1'
        self.addCleanup(os.environ.pop, 'FAKE_NO_ATTACH', None)
        result = gh_publish.doctor(['issue-comment'])
        self.assertFalse(result['ok'])
        self.assertIn('fail', self.statuses(result)['--attach on gh issue comment'])

    def test_doctor_warns_on_older_version_but_probe_decides(self):
        os.environ['FAKE_GH_VERSION'] = '2.90.0'
        self.addCleanup(os.environ.pop, 'FAKE_GH_VERSION', None)
        result = gh_publish.doctor(['pr-body'])
        self.assertTrue(result['ok'])
        self.assertEqual(self.statuses(result)['gh version'], 'warn')

    def test_doctor_requires_gh_and_auth(self):
        os.environ['FAKE_NO_AUTH'] = '1'
        self.addCleanup(os.environ.pop, 'FAKE_NO_AUTH', None)
        self.assertFalse(gh_publish.doctor(['pr-body'])['ok'])
        with mock.patch('gh_publish.shutil.which', return_value=None):
            result = gh_publish.doctor(['pr-body'])
        self.assertFalse(result['ok'])
        self.assertEqual(self.statuses(result), {'gh': 'fail'})

    def test_preflight_passes_and_counts(self):
        result = gh_publish.preflight(self.body, words=[], media_dir=self.media, media_reviewed=True)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['expected'], {'attachments': 2, 'videos': 1, 'characters': len(self.body.read_text())})
        self.assertEqual([Path(p).name for p in result['attachments']], ['01.mp4', 's01.png'])

    def test_preflight_failures(self):
        cases = {
            'missing': '![a](./missing.png)',
            'type': '![a](./notes.zip)',
            'local link': '[files](./s01.png)',
            'html source': '<img src="./s01.png" width="230">',
            'placeholders': '{{MEDIA-01}}',
            'length': 'x' * (gh_publish.MAX_COMMENT_CHARS + 1),
        }
        (self.media / 'notes.zip').write_bytes(b'zip')
        for name, text in cases.items():
            with self.subTest(name):
                self.body.write_text(text)
                self.assertFalse(gh_publish.preflight(self.body, words=[])['ok'], text[:30])

    def test_preflight_flags_privacy_and_unreferenced_media(self):
        self.body.write_text('![a](./s01.png) device SERIAL-A')
        result = gh_publish.preflight(self.body, words=['SERIAL-A'], media_dir=self.media, media_reviewed=True)
        self.assertEqual(self.statuses(result)['privacy comment check'], 'fail')
        self.body.write_text('![a](./s01.png)')
        result = gh_publish.preflight(self.body, words=[], media_dir=self.media, media_reviewed=True)
        self.assertEqual(self.statuses(result)['unreferenced media'], 'warn')
        self.assertTrue(result['ok'])
        result = gh_publish.preflight(self.body, words=[], media_dir=self.media)
        self.assertEqual(self.statuses(result)['privacy media check'], 'fail')

    def test_build_command_is_explicit(self):
        command = gh_publish.build_command('issue-comment', 'o/r', 7, 'b.md', ['/a.png'], True)
        self.assertEqual(command, ['issue', 'comment', '7', '-R', 'o/r', '--body-file', str(Path('b.md').resolve()), '--edit-last', '--attach', '/a.png'])

    def test_post_show_command_runs_nothing(self):
        code, result = self.run_main('post', '--repo', 'o/r', '--kind', 'issue-comment', '--number', '1', '--body-file', str(self.body), '--show-command', *self.privacy_config())
        self.assertEqual(code, 0)
        self.assertEqual(result['command'][:3], ['gh', 'issue', 'comment'])
        self.assertEqual(self.calls(), [])

    def test_post_refuses_when_preflight_fails(self):
        self.body.write_text('![a](./missing.png)')
        code, result = self.run_main('post', '--repo', 'o/r', '--kind', 'issue-comment', '--number', '1', '--body-file', str(self.body), *self.privacy_config())
        self.assertEqual(code, 1)
        self.assertFalse(any(call[:2] == ['issue', 'comment'] and '--attach' in call for call in self.calls()))

    def posted_body(self, urls, html=''):
        self.api.write_text(json.dumps({'body': '\n'.join(urls), 'body_html': html}))

    def test_post_then_verify_passes(self):
        urls = [f'https://github.com/user-attachments/assets/{i}-aaa' for i in (1, 2)]
        self.posted_body(urls, '<video src="x"></video><img src="y" width="230">')
        code, result = self.run_main('post', '--repo', 'o/r', '--kind', 'issue-comment', '--number', '1', '--body-file', str(self.body), *self.privacy_config())
        self.assertEqual(code, 0, result)
        self.assertEqual(result['url'], 'https://github.com/o/r/issues/1#issuecomment-99')
        posted = [call for call in self.calls() if '--attach' in call and call[0] == 'issue']
        self.assertEqual(len(posted), 1)
        self.assertEqual(posted[0].count('--attach'), 2)
        self.assertIn('repos/o/r/issues/comments/99', self.calls()[-1][-1])

    def test_verify_catches_mismatches(self):
        self.posted_body(['https://github.com/user-attachments/assets/1-aaa', '![x](./s01.png)'], '<img src="y">')
        code, result = self.run_main('verify', '--repo', 'o/r', '--comment-id', '99', '--expect-attachments', '2', '--expect-videos', '1', *self.privacy_config())
        self.assertEqual(code, 1)
        failed = {item['check'] for item in result['checks'] if item['status'] == 'fail'}
        self.assertTrue({'attachment URLs', 'local paths', 'rendered videos'} <= failed)

    def test_verify_requires_an_expectation(self):
        self.posted_body([])
        code, result = self.run_main('verify', '--repo', 'o/r', '--issue', '1', *self.privacy_config())
        self.assertEqual(code, 2)

    def test_unsafe_targets_are_rejected_before_gh_runs(self):
        for repo in ('--help/x', 'o/--force', '../r', 'o/..', 'o/r;id', 'o r/x', 'o/r/extra', ''):
            with self.subTest(repo):
                with self.assertRaises(ValueError):
                    gh_publish.validate_target(repo)
        for bad in (dict(number=0), dict(comment_id='9; id'), dict(comment_id='-1')):
            with self.assertRaises(ValueError):
                gh_publish.validate_target('o/r', **bad)
        gh_publish.validate_target('brave-experiments/bart', number=1, comment_id='6620491806')
        code, result = self.run_main('post', '--repo=--foo/bar', '--kind', 'issue-comment', '--number', '1', '--body-file', str(self.body), *self.privacy_config())
        self.assertEqual(code, 2)
        code, result = self.run_main('verify', '--repo', 'o/r', '--comment-id', 'abc', '--expect-attachments', '1', *self.privacy_config())
        self.assertEqual(code, 2)
        self.assertEqual(self.calls(), [])

    def test_gh_runs_by_absolute_path_without_a_shell(self):
        with mock.patch('gh_publish.subprocess.run') as run:
            run.return_value = mock.Mock(returncode=0, stdout='', stderr='')
            gh_publish.run_gh(['--version'])
        command = run.call_args.args[0]
        self.assertTrue(os.path.isabs(command[0]))
        self.assertEqual(Path(command[0]).name, 'gh')
        self.assertEqual(command[1:], ['--version'])
        self.assertFalse(run.call_args.kwargs['shell'])
        self.assertEqual(run.call_args.kwargs['timeout'], gh_publish.GH_TIMEOUT_SECONDS)

    def test_timeout_is_reported_not_raised(self):
        with mock.patch('gh_publish.subprocess.run', side_effect=gh_publish.subprocess.TimeoutExpired('gh', 1)):
            code, result = self.run_main('verify', '--repo', 'o/r', '--comment-id', '1', '--expect-attachments', '1', *self.privacy_config())
        self.assertEqual(code, 2)
        self.assertFalse(result['ok'])

    def test_edit_last_only_for_comments(self):
        code, result = self.run_main('post', '--repo', 'o/r', '--kind', 'pr-body', '--number', '1', '--body-file', str(self.body), '--edit-last', *self.privacy_config())
        self.assertEqual(code, 2)


if __name__ == '__main__':
    unittest.main()
