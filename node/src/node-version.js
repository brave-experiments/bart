import { readFileSync } from 'node:fs';

export const nodeRequirement = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).engines.node;

// Match the package's bounded Node range without adding a dependency to startup.
/** @param {string} version */
export function supportsNode(version) {
  const range = /^>=(\d+)\.(\d+)\.(\d+) <(\d+)$/.exec(nodeRequirement);
  if (!range) throw new Error(`Unsupported engines.node format: ${nodeRequirement}`);
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!parts) return false;
  const [, major, minor, patch] = parts.map(Number);
  const [, minimumMajor, minimumMinor, minimumPatch, maximumMajor] = range.map(Number);
  return major < maximumMajor && (major > minimumMajor ||
    (major === minimumMajor && (minor > minimumMinor ||
      (minor === minimumMinor && patch >= minimumPatch))));
}

export function nodeResult(version = process.versions.node) {
  return `Node.js ${version} (required ${nodeRequirement})`;
}
