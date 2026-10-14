"""Synthetic privacy fixtures; never include real device identifiers."""
import json
import io
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
import tempfile
import unittest
import zipfile
import datetime
from export_privacy import package_context, export_markdown, inspect_export, load_blocked_words, Matcher, main


class ExportPrivacyTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='bart-privacy-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.input = self.root / 'input'
        self.input.mkdir()

    def test_configuration(self):
        config = self.root / 'config.toml'
        config.write_text('[privacy]\nblocked_words=["private"]\n[android]\ndevice_id="SERIAL-A"\nphone_device_id="SERIAL-B"\ntablet_device_id="<tablet-serial>"')
        self.assertEqual(load_blocked_words(config, ['SERIAL-C']), ['private', 'SERIAL-A', 'SERIAL-B', 'SERIAL-C'])
        config.write_text('[privacy]\nblocked_words=[""]')
        with self.assertRaises(ValueError):
            load_blocked_words(config)
        self.assertEqual(load_blocked_words(self.root / 'missing', optional=True), [])
        with self.assertRaises(ValueError):
            load_blocked_words(self.root / 'missing')

    def test_literal_and_encoded_matching(self):
        match = Matcher(['A+B', 'serial'])
        for value in ('prefix-a+b-suffix', 'A%2BB', 'SERIAL', '&#115;&#101;&#114;&#105;&#97;&#108;', r'\u0073\u0065\u0072\u0069\u0061\u006c'):
            self.assertTrue(match.contains(value))
        self.assertFalse(match.contains('AAAB'))
        self.assertEqual(Matcher(['abc', 'abcdef']).redact('abcdef abc'), '[REDACTED] [REDACTED]')

    def test_sanitized_copies_preserve_originals(self):
        original = self.input / 'report.html'
        original.write_text('<p>SERIAL-A</p>')
        output = self.root / 'delivery'
        self.assertFalse(inspect_export(self.input, ['SERIAL-A'], sanitize_to=output)['findings'])
        self.assertEqual(original.read_text(), '<p>SERIAL-A</p>')
        self.assertEqual((output / 'report.html').read_text(), '<p>[REDACTED]</p>')
        self.assertFalse(inspect_export(output, ['SERIAL-A'])['findings'])
        with self.assertRaises(FileExistsError):
            inspect_export(self.input, ['SERIAL-A'], sanitize_to=output)

    def test_filenames_and_directories_fail_without_leaking(self):
        (self.input / 'SERIAL-A.txt').write_text('safe')
        (self.input / 'nested-SERIAL-A').mkdir()
        result = inspect_export(self.input, ['SERIAL-A'], sanitize_to=self.root / 'delivery')
        self.assertEqual(len(result['findings']), 2)
        self.assertNotIn('SERIAL-A', json.dumps(result))
        self.assertFalse((self.root / 'delivery').exists())

    def test_zip_names_content_and_binary_exclusions(self):
        with zipfile.ZipFile(self.input / 'context.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('SERIAL-A/receipt.json', '{"target":"SERIAL-A"}')
            archive.writestr('image.png', b'pixels')
        result = inspect_export(self.input, ['SERIAL-A'])
        self.assertEqual(len(result['findings']), 3)
        self.assertNotIn('SERIAL-A', json.dumps(result))

    def test_clean_and_corrupt_zip(self):
        with zipfile.ZipFile(self.input / 'context.zip', 'w') as archive:
            archive.writestr('context/README.md', 'Device: Pixel 10 Pro')
        self.assertFalse(inspect_export(self.input, ['SERIAL-A'])['findings'])
        (self.input / 'context.zip').write_bytes(b'broken')
        self.assertTrue(inspect_export(self.input, [])['findings'])

    def test_unsupported_links_binary_and_embedded_media(self):
        (self.input / 'linked.txt').symlink_to(self.root)
        (self.input / 'unknown.bin').write_bytes(b'content')
        (self.input / 'invalid.txt').write_bytes(b'\xff')
        (self.input / 'report.html').write_text('<img src="data:image/png;base64,c2VjcmV0">')
        self.assertEqual(len(inspect_export(self.input, [])['findings']), 4)

    def test_media_review_does_not_bypass_metadata(self):
        media = self.input / 'capture.png'
        media.write_bytes(b'pixels')
        self.assertTrue(inspect_export(self.input, ['SERIAL-A'])['findings'])
        self.assertFalse(inspect_export(self.input, ['SERIAL-A'], media_reviewed=True)['findings'])
        media.write_bytes(b'metadata SERIAL-A')
        self.assertTrue(inspect_export(self.input, ['SERIAL-A'], media_reviewed=True)['findings'])

    def test_nested_destination_and_root_identifier(self):
        with self.assertRaises(ValueError):
            inspect_export(self.input, [], sanitize_to=self.input / 'delivery')
        self.assertTrue(inspect_export(self.input, ['input'])['findings'])

    def test_cli_exit_codes_and_private_diagnostics(self):
        def invoke(arguments):
            stdout, stderr = io.StringIO(), io.StringIO()
            with redirect_stdout(stdout), redirect_stderr(stderr):
                try:
                    code = main(arguments)
                except SystemExit as error:
                    code = error.code
            return code, stdout.getvalue() + stderr.getvalue()

        config = self.root / 'config.toml'
        config.write_text('[privacy]\nblocked_words=["SERIAL-A"]')
        command = ['check', '--input', str(self.input), '--config', str(config)]
        self.assertEqual(invoke(command)[0], 0)
        (self.input / 'SERIAL-A.txt').write_text('SERIAL-A')
        code, diagnostics = invoke(command)
        self.assertEqual(code, 1)
        self.assertNotIn('SERIAL-A', diagnostics)
        code, diagnostics = invoke(['SERIAL-A'])
        self.assertEqual(code, 2)
        self.assertNotIn('SERIAL-A', diagnostics)

    def test_markdown_exports(self):
        body = self.root / 'body.md'
        body.write_text('## Result\nPassed on the tested build.')
        comment = self.root / 'comment-out'
        self.assertEqual(export_markdown('comment', ['SERIAL-A'], body, comment)['findings'], [])
        self.assertEqual(sorted(path.name for path in comment.iterdir()), ['comment.md'])
        pr = self.root / 'pr-out'
        export_markdown('pr', ['SERIAL-A'], body, pr, 'fix: handle shields toggle')
        self.assertEqual((pr / 'pr-title.txt').read_text(), 'fix: handle shields toggle\n')
        self.assertEqual((pr / 'pr-body.md').read_text(), body.read_text())
        with self.assertRaises(ValueError):
            export_markdown('comment', [], body, comment)
        for title in ('', 'two\nlines', 'x' * 257):
            with self.assertRaises(ValueError):
                export_markdown('pr', [], body, self.root / 'bad', title)
        with self.assertRaises(ValueError):
            export_markdown('comment', [], body, self.root / 'bad', 'title')

    def test_markdown_export_blocks_sensitive_values_without_output(self):
        body = self.root / 'body.md'
        body.write_text('Device SERIAL-A passed.')
        output = self.root / 'blocked-out'
        self.assertTrue(export_markdown('comment', ['SERIAL-A'], body, output)['findings'])
        self.assertFalse(output.exists())
        body.write_text('Clean body.')
        result = export_markdown('pr', ['SERIAL-A'], body, self.root / 'x', 'Fix SERIAL-A crash')
        self.assertTrue(result['findings'])
        self.assertFalse((self.root / 'x').exists())

    def package(self, words=(), **overrides):
        options = dict(kind='qa', repo='Brave/brave-core', target='pr-40563',
                       now=datetime.datetime(2026, 10, 13, 9, 15, tzinfo=datetime.timezone.utc))
        options.update(overrides)
        out = self.root / 'out'
        out.mkdir(exist_ok=True)
        return package_context(list(words), self.input, out, **options), out

    def test_package_names_and_layout(self):
        (self.input / 'README.md').write_text('# Context')
        (self.input / 'receipts').mkdir()
        (self.input / 'receipts' / 'a.json').write_text('{}')
        result, out = self.package()
        name = 'bart-qa-context-brave-core-pr-40563-20261013T091500Z'
        self.assertEqual(result['archive'], name + '.zip')
        with zipfile.ZipFile(out / (name + '.zip')) as archive:
            self.assertEqual(archive.namelist(), [f'{name}/README.md', f'{name}/receipts/a.json'])
        self.assertTrue(package_context([], self.input, out, kind='review', repo='brave/brave-core', target='issue-1')['archive'].startswith('bart-review-context-brave-core-issue-1-'))
        with self.assertRaises(ValueError):
            self.package()

    def test_package_refuses_unsafe_input_and_leaves_no_zip(self):
        (self.input / 'README.md').write_text('Device SERIAL-A')
        result, out = self.package(['SERIAL-A'])
        self.assertTrue(result['findings'])
        self.assertEqual(list(out.iterdir()), [])
        (self.input / 'README.md').write_text('ok')
        result, out = self.package(['serial-a'], repo='brave/serial-a')
        self.assertTrue(result['findings'])
        self.assertEqual(list(out.iterdir()), [])
        for bad in (dict(repo='brave'), dict(target='40563')):
            with self.assertRaises(ValueError):
                self.package(**bad)
        (self.input / 'shot.png').write_bytes(b'x')
        with self.assertRaises(ValueError):
            self.package()
        (self.input / 'shot.png').unlink()
        (self.input / 'README.md').unlink()
        with self.assertRaises(ValueError):
            self.package()


if __name__ == '__main__':
    unittest.main()
