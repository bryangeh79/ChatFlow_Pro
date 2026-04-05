/**
 * Read current branch + HEAD SHA from .git without invoking the git binary.
 * For Docker / read-only agents that mount the repo but have no git on PATH.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} repoRoot
 * @returns {{ sha: string, branch: string | null, ref: string | null } | null}
 */
export function readGitMetadataFromFs(repoRoot) {
  const gitDir = path.join(repoRoot, '.git');
  const headFile = path.join(gitDir, 'HEAD');
  if (!existsSync(headFile)) {
    return null;
  }

  const head = readFileSync(headFile, 'utf8').trim();

  if (head.startsWith('ref:')) {
    const ref = head.slice(4).trim();
    const branch = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : null;

    const loose = path.join(gitDir, ref);
    if (existsSync(loose)) {
      const sha = readFileSync(loose, 'utf8').trim();
      if (/^[0-9a-f]{40}$/i.test(sha)) {
        return { sha, branch, ref };
      }
    }

    const packedSha = readPackedRef(gitDir, ref);
    if (packedSha) {
      return { sha: packedSha, branch, ref };
    }

    return null;
  }

  if (/^[0-9a-f]{40}$/i.test(head)) {
    return { sha: head, branch: null, ref: null };
  }

  return null;
}

function readPackedRef(gitDir, ref) {
  const packed = path.join(gitDir, 'packed-refs');
  if (!existsSync(packed)) {
    return null;
  }
  const text = readFileSync(packed, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('^')) continue;
    const sp = t.indexOf(' ');
    if (sp === -1) continue;
    const sha = t.slice(0, sp);
    const r = t.slice(sp + 1).trim();
    if (r === ref && /^[0-9a-f]{40}$/i.test(sha)) {
      return sha;
    }
  }
  return null;
}
