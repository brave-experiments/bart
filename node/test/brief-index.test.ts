import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validateBriefIndex } from '../src/brief-index.ts';

test('finding/check definitions, metadata and descriptive links agree', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'bart-brief-'));
  const index = {
    findings: [{ id: 'finding-001', title: 'Feature gate', sourceIds: ['feature'] }],
    checks: [{ id: 'check-001', title: 'Disabled comparison' }],
  };
  const finding = '<a id="finding-001"></a>\n## Feature gate';
  const plan = '<a id="check-001"></a>\n[Disabled comparison](#check-001)\n[Feature gate](context/findings.md#finding-001)';
  const cases = [
    { name: 'valid explicit links', index, finding, plan, error: undefined },
    { name: 'ad hoc finding ID', index: { ...index, findings: [{ ...index.findings[0], id: 'Y-C1' }] }, finding, plan, error: /Invalid or duplicate finding/ },
    { name: 'duplicate check ID', index: { ...index, checks: [...index.checks, ...index.checks] }, finding, plan, error: /Invalid or duplicate check/ },
    { name: 'unknown source', index: { ...index, findings: [{ ...index.findings[0], sourceIds: ['missing'] }] }, finding, plan, error: /known source IDs/ },
    { name: 'missing anchor', index, finding: '## Feature gate', plan, error: /Explicit anchors/ },
    { name: 'duplicate anchor', index, finding: finding + finding, plan, error: /Explicit anchors/ },
    { name: 'wrong relative destination', index, finding, plan: plan.replace('context/findings.md', '../findings.md'), error: /Invalid finding\/check link/ },
    { name: 'unknown linked finding', index, finding, plan: plan.replace('#finding-001', '#finding-002'), error: /Invalid finding\/check link/ },
    { name: 'opaque label', index, finding, plan: plan.replace('[Feature gate]', '[finding-001]'), error: /Invalid finding\/check link/ },
    { name: 'unlinked finding', index, finding, plan: plan.split('\n').slice(0, 2).join('\n'), error: /must link to finding-001/ },
    { name: 'code example cannot supply anchor', index, finding: '```html\n' + finding + '\n```', plan, error: /Explicit anchors/ },
    ...['~~~markdown', '````markdown', '   ```markdown'].map(fence => ({
      name: `${fence} example cannot supply navigation`, index,
      finding: `${fence}\n${finding}\n${fence.replace('markdown', '')}`,
      plan: `${fence}\n${plan}\n${fence.replace('markdown', '')}`,
      error: /Explicit anchors/,
    })),
    { name: 'unclosed fence cannot supply anchor', index, finding: '~~~\n' + finding, plan, error: /Explicit anchors/ },
    { name: 'fenced links cannot supply references', index, finding,
      plan: '<a id="check-001"></a>\n~~~\n' + plan.split('\n').slice(1).join('\n') + '\n~~~', error: /must link to/ },
  ];
  try {
    await mkdir(join(root, 'context'));
    for (const sample of cases) await t.test(sample.name, async () => {
      await writeFile(join(root, 'context/brief-index.json'), JSON.stringify(sample.index));
      await writeFile(join(root, 'context/findings.md'), sample.finding);
      await writeFile(join(root, 'test-plan.md'), sample.plan);
      if (sample.error) await assert.rejects(validateBriefIndex(root, new Set(['feature'])), sample.error);
      else await validateBriefIndex(root, new Set(['feature']));
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});
