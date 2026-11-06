import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261106150000_kanawa_installation_policy_merge.sql', import.meta.url),
  'utf8'
);

test('installation policies preserve both platform-admin and self-member access in one policy', () => {
  assert.match(sql, /private\.ks_is_platform_admin\(\)[\s\S]*OR \(private\.ks_is_company_member\(company_id\) AND user_id = \(SELECT auth\.uid\(\)\)\)/);
  assert.match(sql, /FOR UPDATE TO authenticated[\s\S]*USING \([\s\S]*private\.ks_is_platform_admin\(\)/);
  assert.match(sql, /WITH CHECK \([\s\S]*private\.ks_is_platform_admin\(\)/);
});
