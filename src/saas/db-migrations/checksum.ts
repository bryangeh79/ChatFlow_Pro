import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** UTF-8 file contents → lowercase hex SHA-256. */
export function sha256HexOfFile(absPath: string): string {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Resolve `relativePath` under `src/saas/db-migrations/` or mirrored `dist/.../db-migrations/`.
 * Fail fast if neither exists.
 */
export function resolveSaasMigrationAssetPath(relativePath: string): string {
  const rel = relativePath.replace(/\\/g, '/');
  const fromSrc = path.normalize(path.join(process.cwd(), 'src', 'saas', 'db-migrations', rel));
  const fromDist = path.normalize(path.join(process.cwd(), 'dist', 'src', 'saas', 'db-migrations', rel));
  if (fs.existsSync(fromSrc)) return fromSrc;
  if (fs.existsSync(fromDist)) return fromDist;
  throw new Error(`saas_migration_asset_missing:${rel}`);
}
