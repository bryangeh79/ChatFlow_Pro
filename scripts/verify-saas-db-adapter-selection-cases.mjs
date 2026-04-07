/**
 * Child entry: argv[2] = default | sqljs | postgres | invalid
 * Fresh process per case (no shared adapter cache).
 */

import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);
const mod = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));

const caseId = process.argv[2];

async function main() {
  switch (caseId) {
    case 'default': {
      delete process.env.CHATFLOW_SAAS_DB_DRIVER;
      if (mod.getSaaSDbDriver() !== 'sqljs') throw new Error('default: expected sqljs');
      break;
    }
    case 'sqljs': {
      process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
      if (mod.getSaaSDbDriver() !== 'sqljs') throw new Error('sqljs: expected driver sqljs');
      const a = await mod.getSaasDbAdapter();
      if (a.constructor.name !== 'SqlJsSaaSDbAdapter') {
        throw new Error(`sqljs: expected SqlJsSaaSDbAdapter, got ${a.constructor.name}`);
      }
      break;
    }
    case 'postgres': {
      process.env.CHATFLOW_SAAS_DB_DRIVER = 'postgres';
      if (mod.getSaaSDbDriver() !== 'postgres') throw new Error('postgres: expected driver postgres');
      const a = await mod.getSaasDbAdapter();
      if (a.constructor.name !== 'PostgresSaaSDbAdapter') {
        throw new Error(`postgres: expected PostgresSaaSDbAdapter, got ${a.constructor.name}`);
      }
      let threw = false;
      try {
        await a.queryOne('SELECT 1', []);
      } catch (e) {
        threw = true;
        if (e instanceof Error && e.message === mod.POSTGRES_ADAPTER_NOT_IMPLEMENTED) {
          break;
        }
        throw e;
      }
      if (!threw) throw new Error('postgres: expected queryOne to throw');
      break;
    }
    case 'invalid': {
      process.env.CHATFLOW_SAAS_DB_DRIVER = 'mysql';
      try {
        mod.getSaaSDbDriver();
        throw new Error('invalid: expected getSaaSDbDriver to throw');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.startsWith('invalid_chatflow_saas_db_driver:')) throw e;
      }
      break;
    }
    default:
      throw new Error(`unknown case: ${caseId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
