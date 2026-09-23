import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected object: ${label}`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Expected nonempty string: ${label}`);
  return value;
}

function capture(value: unknown, available: Set<string>): string {
  const path = text(value, 'capture');
  if (path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') ||
      !available.has(`context/${path}`)) {
    throw new Error(`Capture must reference a regular file inside context: ${path}`);
  }
  return path;
}

function timestamp(value: unknown, label: string) {
  if (!Number.isFinite(Date.parse(text(value, label)))) throw new Error(`Invalid timestamp: ${label}`);
}

/** Check local structure and references, not the truth or completeness of research. */
export async function validateSourceIndex(directory: string, packageFiles: string[]) {
  const available = new Set(packageFiles);
  const sources: unknown = JSON.parse(await readFile(join(directory, 'context/sources.json'), 'utf8'));
  if (!Array.isArray(sources) || !sources.length) throw new Error('sources.json must be a nonempty array');
  const ids = new Set<string>();
  for (const value of sources) {
    const source = object(value, 'source');
    const id = text(source.id, 'source.id');
    if (ids.has(id)) throw new Error(`Duplicate source ID: ${id}`);
    ids.add(id);
    capture(source.capture, available);
    timestamp(source.retrievedAt, `${id}.retrievedAt`);
    text(source.supports, `${id}.supports`);
  }
  const index = object(JSON.parse(await readFile(join(directory, 'context/source-index.json'), 'utf8')), 'source-index');
  timestamp(index.retrievedAt, 'source-index.retrievedAt');
  if (!Array.isArray(index.files)) throw new Error('source-index.files must be an array');
  for (const value of index.files) {
    const file = object(value, 'source-index file');
    text(file.role, 'file.role');
    text(file.path, 'file.path');
    const revision = text(file.revision, 'file.revision');
    if ('error' in file) {
      text(file.error, 'file.error');
      if ('capture' in file) throw new Error('Failed source reads must not claim a capture');
    } else {
      text(file.repository, 'file.repository');
      if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Captured source needs a full commit SHA');
      capture(file.capture, available);
    }
  }
  return ids;
}
