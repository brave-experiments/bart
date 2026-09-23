import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validateSourceIndex } from '../src/source-index.ts';

test('source validation checks capture references and retains failed read records', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'bart-sources-'));
  const source = { id: 'claim', capture: 'report.txt', retrievedAt: '2026-09-21T00:00:00Z', supports: 'Reported problem' };
  const captured = { role: 'head', path: 'file.cc', repository: 'https://github.com/brave/brave-core', revision: 'a'.repeat(40), capture: 'report.txt' };
  const index = { retrievedAt: source.retrievedAt, files: [captured, { role: 'base', path: 'missing.cc', revision: 'tag', error: 'Not found' }] };
  const available = ['context/report.txt', 'context/sources.json', 'context/source-index.json'];
  try {
    await mkdir(join(root, 'context'));
    const cases = [
      { name: 'valid captures and failed reads', sources: [source], index, error: undefined },
      { name: 'duplicate IDs', sources: [source, source], index, error: /Duplicate source ID/ },
      { name: 'non-array sources', sources: {}, index, error: /nonempty array/ },
      { name: 'escaping capture', sources: [{ ...source, capture: '../outside.txt' }], index, error: /inside context/ },
      { name: 'missing capture', sources: [{ ...source, capture: 'absent.txt' }], index, error: /inside context/ },
      { name: 'bad index shape', sources: [source], index: { ...index, files: {} }, error: /must be an array/ },
      { name: 'missing indexed capture', sources: [source], index: { ...index, files: [{ ...captured, capture: 'absent.cc' }] }, error: /inside context/ },
      { name: 'unpinned captured source', sources: [source], index: { ...index, files: [{ ...captured, revision: 'HEAD' }] }, error: /full commit SHA/ },
    ];
    for (const sample of cases) {
      await t.test(sample.name, async () => {
        await writeFile(join(root, 'context/sources.json'), JSON.stringify(sample.sources));
        await writeFile(join(root, 'context/source-index.json'), JSON.stringify(sample.index));
        if (sample.error) await assert.rejects(validateSourceIndex(root, available), sample.error);
        else await validateSourceIndex(root, available);
      });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
