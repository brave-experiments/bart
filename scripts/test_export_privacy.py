"""Synthetic privacy fixtures; never include real device identifiers."""
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
import zipfile
from export_privacy import inspect_export, load_blocked_words, Matcher


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
        script = Path(__file__).with_name('export_privacy.py')
        config = self.root / 'config.toml'
        config.write_text('[privacy]\nblocked_words=["SERIAL-A"]')
        command = [sys.executable, str(script), 'check', '--input', str(self.input), '--config', str(config)]
        self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
        (self.input / 'SERIAL-A.txt').write_text('SERIAL-A')
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('SERIAL-A', result.stdout + result.stderr)
        result = subprocess.run([sys.executable, str(script), 'SERIAL-A'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('SERIAL-A', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
