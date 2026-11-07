'use strict';

const { createHash } = require('node:crypto');
const genericMessage = 'Se os dados corresponderem a uma conta activa, receberá um código.';

function reply(statusCode, data, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return { statusCode, headers, body: statusCode === 204 ? '' : JSON.stringify(data || {}) };
}

function allowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'http://localhost:8888' || origin === 'http://127.0.0.1:8888') return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && (
      u.hostname === 'kanawasoft-vip.netlify.app' ||
      /^deploy-preview-\d+--kanawasoft-vip\.netlify\.app$/.test(u.hostname) ||
      /^[a-z0-9-]+--kanawasoft-vip\.netlify\.app$/.test(u.hostname)
    );
  } catch (_) { return false; }
}

function normalizeIdentifier(value, channel) {
  const raw = String(value || '').trim();
  if (channel === 'email') {
    const email = raw.toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Introduza um endereço de email válido.');
    return email;
  }
  const phone = raw.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Introduza o telefone em formato internacional, por exemplo +244923000000.');
  return phone;
}

function hashRateKey(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

async function consumeRateLimit(c, key, maxRequests) {
  const allowed = await supabaseRequest(c, '/rest/v1/rpc/ks_consume_auth_otp_rate_limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_rate_key: hashRateKey(key),
      p_max_requests: maxRequests,
      p_window_seconds: 600
    })
  });
  return allowed === true;
}

function config() {
  const e = process.env;
  const c = {
    supabaseUrl: (e.SUPABASE_URL || '').replace(/\/$/, ''),
    serviceKey: e.SUPABASE_SERVICE_ROLE_KEY,
    accountSid: e.TWILIO_ACCOUNT_SID,
    apiUser: e.TWILIO_API_KEY || e.TWILIO_ACCOUNT_SID,
    apiPassword: e.TWILIO_API_SECRET || e.TWILIO_AUTH_TOKEN,
    serviceSid: e.TWILIO_VERIFY_SERVICE_SID
  };
  if (!c.supabaseUrl || !c.serviceKey || !c.accountSid || !c.apiUser || !c.apiPassword || !/^VA[0-9a-f]{32}$/i.test(c.serviceSid || '')) {
    throw new Error('Configuração de autenticação incompleta.');
  }
  return c;
}

async function supabaseRequest(c, path, options = {}) {
  const r = await fetch(c.supabaseUrl + path, {
    ...options,
    headers: { apikey: c.serviceKey, Authorization: 'Bearer ' + c.serviceKey, ...(options.headers || {}) }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error('Supabase request failed'); e.status = r.status; throw e; }
  return data;
}

async function findAccount(c, identifier, channel) {
  const q = new URLSearchParams({ select: 'user_id,email,phone_e164', limit: '2' });
  q.set(channel === 'email' ? 'email' : 'phone_e164', 'eq.' + identifier);
  const rows = await supabaseRequest(c, '/rest/v1/ks_profiles?' + q.toString());
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].user_id) return null;
  const profile = rows[0];
  const members = await supabaseRequest(c, '/rest/v1/ks_company_memberships?' + new URLSearchParams({
    select: 'user_id', user_id: 'eq.' + profile.user_id, status: 'eq.active', limit: '1'
  }).toString());
  if (!Array.isArray(members) || !members.length) return null;
  let email = String(profile.email || '').trim().toLowerCase();
  if (!email) {
    const user = await supabaseRequest(c, '/auth/v1/admin/users/' + encodeURIComponent(profile.user_id));
    email = String(user.email || '').trim().toLowerCase();
  }
  return email ? { email } : null;
}

async function twilioRequest(c, path, fields) {
  const basic = Buffer.from(c.apiUser + ':' + c.apiPassword).toString('base64');
  const r = await fetch('https://verify.twilio.com/v2/Services/' + c.serviceSid + path, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString()
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error('Twilio Verify request failed'); e.status = r.status; e.providerCode = data.code; throw e; }
  return data;
}

async function createSessionToken(c, email) {
  const data = await supabaseRequest(c, '/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email })
  });
  const hash = data && data.properties && data.properties.hashed_token;
  if (!hash) throw new Error('Supabase did not return a one-time session token.');
  return hash;
}

async function handler(event) {
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  if (!allowedOrigin(origin)) return reply(403, { error: 'Origem não autorizada.' }, origin);
  if (event.httpMethod === 'OPTIONS') {
    const r = reply(204, {}, origin);
    r.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    r.headers['Access-Control-Allow-Headers'] = 'Content-Type';
    return r;
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Método não permitido.' }, origin);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return reply(400, { error: 'Pedido inválido.' }, origin); }
  const channel = body.channel === 'sms' || body.channel === 'email' ? body.channel : null;
  if (!channel || !['start', 'verify'].includes(body.action)) return reply(400, { error: 'Canal ou operação inválida.' }, origin);

  let identifier;
  try { identifier = normalizeIdentifier(body.identifier, channel); }
  catch (e) { return reply(400, { error: e.message }, origin); }
  const code = String(body.code || '').replace(/\s/g, '');
  if (body.action === 'verify' && !/^\d{6}$/.test(code)) return reply(400, { error: 'Introduza o código de 6 dígitos recebido.' }, origin);

  try {
    const c = config();
    const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'unknown';
    const cleanIp = String(ip).split(',')[0].trim();
    const ipAllowed = await consumeRateLimit(c, 'ip:' + cleanIp + ':' + body.action, 20);
    const targetAllowed = await consumeRateLimit(c, 'target:' + cleanIp + ':' + channel + ':' + identifier + ':' + body.action, body.action === 'start' ? 5 : 10);
    if (!ipAllowed || !targetAllowed) return reply(429, { error: 'Demasiadas tentativas. Aguarde alguns minutos.' }, origin);
    const account = await findAccount(c, identifier, channel);
    if (body.action === 'start') {
      if (!account) return reply(202, { ok: true, message: genericMessage }, origin);
      await twilioRequest(c, '/Verifications', { To: identifier, Channel: channel, CustomFriendlyName: 'Kanawa Soft' });
      return reply(200, { ok: true, message: genericMessage }, origin);
    }
    if (!account) return reply(400, { error: 'Código incorrecto ou expirado. Verifique os dados e tente novamente.' }, origin);
    const checked = await twilioRequest(c, '/VerificationCheck', { To: identifier, Code: code });
    if (checked.status !== 'approved') return reply(400, { error: 'Código incorrecto ou expirado. Peça um novo código.' }, origin);
    const tokenHash = await createSessionToken(c, account.email);
    return reply(200, { ok: true, token_hash: tokenHash }, origin);
  } catch (e) {
    console.error('[Kanawa OTP] provider error:', e.providerCode || e.status || e.message);
    return reply(e.status === 429 ? 429 : 502, {
      error: e.status === 429 ? 'Aguarde antes de tentar novamente.' : 'Não foi possível concluir a autenticação. Verifique a configuração do serviço.'
    }, origin);
  }
}

module.exports = { handler, normalizeIdentifier, allowedOrigin, hashRateKey, consumeRateLimit };
