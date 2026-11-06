import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer } from '../server/server.js';

const serverSource = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('server has no SQLite runtime or local database initialization', () => {
  assert.doesNotMatch(serverSource, /sql\.js|initDB|kanawa\.db|dbInstance|SQLite/i);
  assert.equal(Object.hasOwn(packageJson.dependencies || {}, 'sql.js'), false);
  assert.equal(Object.hasOwn(packageJson.dependencies || {}, 'bcryptjs'), false);
});

test('local API starts without a database and reports Supabase as primary storage', async () => {
  const result = await startServer({ port: 0 });
  try {
    const response = await fetch('http://127.0.0.1:' + result.port + '/api/health');
    assert.equal(response.status, 200);
    const health = await response.json();
    assert.equal(health.primaryStorage, 'supabase-postgresql');
    assert.equal(health.legacySqliteApi, 'disabled');
  } finally {
    await new Promise((resolve, reject) => result.server.close(error => error ? reject(error) : resolve()));
  }
});
