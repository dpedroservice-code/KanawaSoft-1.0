import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261106123000_kanawa_fk_performance_indexes.sql', import.meta.url),
  'utf8'
);

test('indexes cover both foreign keys reported by the Supabase advisor', () => {
  assert.match(migration, /idx_ks_company_branches_created_by[\s\S]*ON public\.ks_company_branches\s*\(created_by\)/);
  assert.match(migration, /idx_ks_store_api_keys_created_by[\s\S]*ON public\.ks_store_api_keys\s*\(created_by\)/);
});
