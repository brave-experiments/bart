import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Entry { id: string; title: string; sourceIds?: string[] }

function entries(value: unknown, kind: 'finding' | 'check', sourceIds: Set<string>): Entry[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`brief-index ${kind}s must be a nonempty array`);
  const ids = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' ||
        !new RegExp(`^${kind}-(?!000)[0-9]{3}$`).test(entry.id) || ids.has(entry.id)) {
      throw new Error(`Invalid or duplicate ${kind} ID`);
    }
    ids.add(entry.id);
    if (typeof entry.title !== 'string' || !entry.title.trim() || entry.title.trim() === entry.id) {
      throw new Error(`${entry.id} needs a descriptive title`);
    }
    if (kind === 'finding' && (!Array.isArray(entry.sourceIds) || !entry.sourceIds.length ||
        entry.sourceIds.some((id: unknown) => typeof id !== 'string' || !sourceIds.has(id)))) {
      throw new Error(`${entry.id} must reference known source IDs`);
    }
    return entry;
  });
}

function withoutFencedCode(content: string): string {
  let fence: string | undefined;
  return content.split('\n').filter(line => {
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)?.[1];
      if (closing && closing[0] === fence[0] && closing.length >= fence.length) fence = undefined;
      return false;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1]![0] === '`' && opening[2]!.includes('`'))) {
      fence = opening[1];
      return false;
    }
    return true;
  }).join('\n');
}

function withoutCodeSpans(content: string): string {
  const delimiters = [...content.matchAll(/`+/g)];
  let result = '';
  let start = 0;
  for (let i = 0; i < delimiters.length; i++) {
    const opening = delimiters[i]!;
    const closingIndex = delimiters.findIndex((closing, j) => j > i && closing[0] === opening[0]);
    if (closingIndex === -1) continue;
    const closing = delimiters[closingIndex]!;
    result += content.slice(start, opening.index) + ' ';
    start = closing.index + closing[0].length;
    i = closingIndex;
  }
  return result + content.slice(start);
}

/** Validate the small Markdown linking convention, not the research or general Markdown. */
export async function validateBriefIndex(directory: string, sourceIds: Set<string>) {
  const index = JSON.parse(await readFile(join(directory, 'context/brief-index.json'), 'utf8'));
  const findings = entries(index?.findings, 'finding', sourceIds);
  const checks = entries(index?.checks, 'check', sourceIds);
  const documents = [
    { path: 'context/findings.md', entries: findings },
    { path: 'test-plan.md', entries: checks },
  ];
  const texts = new Map<string, string>();
  for (const document of documents) {
    const content = await readFile(join(directory, document.path), 'utf8');
    // Code examples are not definitions or references.
    const text = withoutCodeSpans(withoutFencedCode(content));
    texts.set(document.path, text);
    const anchors = [...text.matchAll(/<a id="([^"]+)"><\/a>/g)].map(match => match[1]!);
    const expected = document.entries.map(entry => entry.id);
    if (JSON.stringify(anchors.sort()) !== JSON.stringify(expected.sort())) {
      throw new Error(`Explicit anchors must match brief-index entries in ${document.path}`);
    }
  }
  const referenced = new Set<string>();
  for (const [path, text] of texts) {
    for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^)\s]+)\)/g)) {
      const [, label, target] = match;
      const fragmentStart = target!.indexOf('#');
      const file = target!.slice(0, fragmentStart);
      const anchor = fragmentStart === -1 ? '' : target!.slice(fragmentStart + 1);
      if (!anchor || !/^(finding|check)-/.test(anchor)) continue;
      const isFinding = anchor.startsWith('finding-');
      const entry = (isFinding ? findings : checks).find(entry => entry.id === anchor);
      const expectedFile = isFinding
        ? (path === 'test-plan.md' ? 'context/findings.md' : '')
        : (path === 'test-plan.md' ? '' : '../test-plan.md');
      if (!entry || file !== expectedFile || label !== entry.title) {
        throw new Error(`Invalid finding/check link in ${path}: ${match[0]}`);
      }
      if (path === 'test-plan.md') referenced.add(anchor);
    }
  }
  for (const entry of [...findings, ...checks]) {
    if (!referenced.has(entry.id)) throw new Error(`test-plan.md must link to ${entry.id} using its title`);
  }
}
