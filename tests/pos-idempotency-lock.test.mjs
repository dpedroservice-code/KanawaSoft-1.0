import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261106140000_kanawa_pos_idempotency_lock_fix.sql', import.meta.url),
  'utf8'
);

test('idempotent retry no longer requires UPDATE privilege on immutable sales', () => {
  assert.match(sql, /pg_get_functiondef\('public\.ks_finalize_sale\(uuid,jsonb,jsonb\)'::regprocedure\)/);
  assert.match(sql, /replace\(v_definition, E'\\n    FOR UPDATE;'/);
  assert.match(sql, /EXECUTE v_definition/);
  assert.doesNotMatch(sql, /GRANT UPDATE ON public\.ks_sales/);
});
