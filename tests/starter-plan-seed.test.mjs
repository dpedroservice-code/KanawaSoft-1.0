import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261106130000_kanawa_seed_starter_trial_plan.sql', import.meta.url),
  'utf8'
);

test('onboarding starter plan is seeded without inventing price or commercial limits', () => {
  assert.match(sql, /'starter'/);
  assert.match(sql, /'Starter — Avaliação técnica \(14 dias\)'/);
  assert.match(sql, /ON CONFLICT \(code\) DO NOTHING/);
  assert.match(sql, /ARRAY\[\]::text\[\]/);
  assert.equal((sql.match(/NULL/g) || []).length, 7);
});
