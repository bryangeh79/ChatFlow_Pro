import { getSaaSDatabase } from '../db';
import { SqlJsSaaSDbAdapter } from './sqljs-adapter';
import type { SaaSDbAdapter } from './types';

export type { DbRow, SaaSDbAdapter } from './types';
export { SqlJsSaaSDbAdapter } from './sqljs-adapter';

let defaultAdapter: Promise<SaaSDbAdapter> | null = null;

/** Default live backend: sql.js (same process singleton as getSaaSDatabase). */
export async function getSaasDbAdapter(): Promise<SaaSDbAdapter> {
  if (!defaultAdapter) {
    defaultAdapter = getSaaSDatabase().then((db) => new SqlJsSaaSDbAdapter(db));
  }
  return defaultAdapter;
}
