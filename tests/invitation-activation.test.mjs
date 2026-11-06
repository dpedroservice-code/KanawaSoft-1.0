import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261106133000_kanawa_invitation_activation.sql', import.meta.url),
  'utf8'
);

test('confirmed invitation users become active immediately; unconfirmed users wait for email confirmation', () => {
  assert.match(sql, /CASE WHEN new\.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'invited' END/);
  assert.match(sql, /ON CONFLICT \(company_id,user_id\) DO UPDATE/);
  assert.match(sql, /i\.accepted_at IS NULL/);
  assert.match(sql, /i\.expires_at > now\(\)/);
  assert.match(sql, /lower\(i\.email\) = lower\(new\.email\)/);
});
