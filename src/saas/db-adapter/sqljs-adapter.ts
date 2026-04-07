import type { SqlJsDatabase } from '../db';
import { persistSaaSDatabase } from '../db';
import type { DbRow, SaaSDbAdapter } from './types';

export class SqlJsSaaSDbAdapter implements SaaSDbAdapter {
  constructor(private readonly db: SqlJsDatabase) {}

  async queryOne(sql: string, params: unknown[] = []): Promise<DbRow | null> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = stmt.getAsObject() as DbRow;
    stmt.free();
    return row;
  }

  async queryAll(sql: string, params: unknown[] = []): Promise<DbRow[]> {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: DbRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as DbRow);
    }
    stmt.free();
    return rows;
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.db.run(sql, params);
  }

  async persistIfNeeded(): Promise<void> {
    persistSaaSDatabase();
  }

  async transaction<T>(fn: (tx: SaaSDbAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
