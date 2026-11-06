import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cloud = readFileSync(new URL('../app/cloud.js', import.meta.url), 'utf8');

test('finalized POS payload is sent to the atomic RPC as record_payload', () => {
  assert.match(cloud, /record_payload:\s*Object\.assign\(\{\},\s*item/);
  assert.match(cloud, /itens:\s*saleItems\.map\(/);
  assert.match(cloud, /client\.rpc\('ks_finalize_sale'/);
});

test('finalized sale returns after RPC and does not write a second mirror via Data API', () => {
  const start = cloud.indexOf("if (store === 'vendas' && item.status === 'finalizada'");
  const end = cloud.indexOf('\n      async deleteRecord', start);
  const block = cloud.slice(start, end);
  const returned = block.indexOf('return true;');
  const genericWrite = block.indexOf("const result = await client");
  assert.ok(returned >= 0);
  assert.ok(genericWrite > returned, 'generic record writes must occur only after the finalized-sale early return');
});
