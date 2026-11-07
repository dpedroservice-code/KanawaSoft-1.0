import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('../netlify/functions/kanawa-auth-otp.js');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function setEnv() {
  Object.assign(process.env, {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
    TWILIO_API_KEY: 'SK' + '2'.repeat(32),
    TWILIO_API_SECRET: 'secret-test',
    TWILIO_VERIFY_SERVICE_SID: 'VA' + '3'.repeat(32)
  });
}
function event(body) {
  return { httpMethod: 'POST', headers: { origin: 'https://kanawasoft-vip.netlify.app', 'x-nf-client-connection-ip': '203.0.113.10' }, body: JSON.stringify(body) };
}
function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}
function rateLimitResponse() { return response(200, true); }

test('normaliza email e telefone internacional', () => {
  assert.equal(auth.normalizeIdentifier(' USER@EXAMPLE.COM ', 'email'), 'user@example.com');
  assert.equal(auth.normalizeIdentifier('+244 923 000 000', 'sms'), '+244923000000');
});
test('rejeita identificadores e origens inválidos', () => {
  assert.throws(() => auth.normalizeIdentifier('sem-email', 'email'));
  assert.throws(() => auth.normalizeIdentifier('923000000', 'sms'));
  assert.equal(auth.allowedOrigin('https://example.org'), false);
});
test('gera chaves de rate limit não reversíveis e sem PII', () => {
  const hash = auth.hashRateKey('ip:203.0.113.10:email:user@example.com:start');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes('user@example.com'), false);
});
test('bloqueia excesso de pedidos usando o limitador persistente', async () => {
  setEnv();
  let profileLookups = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/rpc/ks_consume_auth_otp_rate_limit')) return response(200, false);
    if (String(url).includes('/rest/v1/ks_profiles')) profileLookups++;
    return response(200, []);
  };
  const r = await auth.handler(event({ action: 'start', channel: 'email', identifier: 'user@example.com' }));
  assert.equal(r.statusCode, 429);
  assert.equal(profileLookups, 0);
});
test('não revela se uma conta existe ao solicitar código', async () => {
  setEnv();
  let profileLookups = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/rpc/ks_consume_auth_otp_rate_limit')) return rateLimitResponse();
    if (String(url).includes('/rest/v1/ks_profiles')) { profileLookups++; return response(200, []); }
    throw new Error('Unexpected URL ' + url);
  };
  const r = await auth.handler(event({ action: 'start', channel: 'email', identifier: 'unknown@example.com' }));
  assert.equal(r.statusCode, 202);
  assert.equal(JSON.parse(r.body).ok, true);
  assert.equal(profileLookups, 1);
});
test('envia email e SMS via Verify e só emite sessão após aprovação', async () => {
  setEnv();
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/ks_consume_auth_otp_rate_limit')) return rateLimitResponse();
    if (String(url).includes('/rest/v1/ks_profiles')) return response(200, [{ user_id: '11111111-1111-4111-8111-111111111111', email: 'user@example.com', phone_e164: '+244923000000' }]);
    if (String(url).includes('/rest/v1/ks_company_memberships')) return response(200, [{ user_id: '11111111-1111-4111-8111-111111111111' }]);
    if (String(url).includes('/Verifications')) return response(201, { status: 'pending' });
    if (String(url).includes('/VerificationCheck')) return response(200, { status: 'approved' });
    if (String(url).includes('/auth/v1/admin/generate_link')) return response(200, { properties: { hashed_token: 'one-time-token-hash' } });
    throw new Error('Unexpected URL ' + url);
  };
  const sms = await auth.handler(event({ action: 'start', channel: 'sms', identifier: '+244923000000' }));
  assert.equal(sms.statusCode, 200);
  assert.ok(calls.some(x => x.url.includes('/Verifications') && x.options.body.includes('Channel=sms')));
  const verified = await auth.handler(event({ action: 'verify', channel: 'sms', identifier: '+244923000000', code: '123456' }));
  assert.equal(verified.statusCode, 200);
  assert.equal(JSON.parse(verified.body).token_hash, 'one-time-token-hash');
  const email = await auth.handler(event({ action: 'start', channel: 'email', identifier: 'user@example.com' }));
  assert.equal(email.statusCode, 200);
  assert.ok(calls.some(x => x.url.includes('/Verifications') && x.options.body.includes('Channel=email')));
});
test('não cria sessão para código não aprovado', async () => {
  setEnv();
  let generated = false;
  global.fetch = async (url) => {
    if (String(url).includes('/rpc/ks_consume_auth_otp_rate_limit')) return rateLimitResponse();
    if (String(url).includes('/rest/v1/ks_profiles')) return response(200, [{ user_id: '11111111-1111-4111-8111-111111111111', email: 'user@example.com' }]);
    if (String(url).includes('/rest/v1/ks_company_memberships')) return response(200, [{ user_id: '11111111-1111-4111-8111-111111111111' }]);
    if (String(url).includes('/VerificationCheck')) return response(200, { status: 'pending' });
    if (String(url).includes('/admin/generate_link')) generated = true;
    return response(200, {});
  };
  const r = await auth.handler(event({ action: 'verify', channel: 'email', identifier: 'user@example.com', code: '000000' }));
  assert.equal(r.statusCode, 400);
  assert.equal(generated, false);
});
test.after(() => {
  global.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
