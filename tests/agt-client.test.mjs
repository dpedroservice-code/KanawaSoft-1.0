import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgtClient } = require('../server/agt/client.js');

function makeKey() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
}

test('AGT client signs document, submits it and returns requestID', async () => {
  const pair = makeKey();
  let sent;
  const client = createAgtClient({
    submitUrl: 'https://agt.example.test/submit',
    statusUrlTemplate: 'https://agt.example.test/status/{requestID}',
    privateKey: pair.privateKey,
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, status: 200, text: async () => JSON.stringify({ requestID: 'req-123' }) };
    }
  });
  const result = await client.submitDocument({ documentNo: 'FT 1/2026', total: 100 });
  assert.equal(result.requestID, 'req-123');
  assert.equal(sent.documentNo, 'FT 1/2026');
  assert.equal(sent.jwsDocumentSignature.split('.').length, 3);
});

test('AGT client queries status and preserves the original resultCode', async () => {
  const pair = makeKey();
  let requestedUrl;
  const client = createAgtClient({
    submitUrl: 'https://agt.example.test/submit',
    statusUrlTemplate: 'https://agt.example.test/status/{requestID}',
    privateKey: pair.privateKey,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, status: 200, text: async () => JSON.stringify({ resultCode: 7, detail: 'provider response' }) };
    }
  });
  const result = await client.getDocumentStatus('req / 7');
  assert.match(requestedUrl, /req%20%2F%207$/);
  assert.equal(result.resultCode, 7);
  assert.equal(result.response.detail, 'provider response');
});

test('AGT client rejects missing requestID instead of retrying a possibly accepted invoice', async () => {
  const pair = makeKey();
  const client = createAgtClient({
    submitUrl: 'https://agt.example.test/submit',
    statusUrlTemplate: 'https://agt.example.test/status/{requestID}',
    privateKey: pair.privateKey,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => '{}' })
  });
  await assert.rejects(client.submitDocument({ documentNo: 'FT 2/2026' }), (error) => error.outcomeUnknown === true);
});

test('AGT client refuses non-HTTPS remote endpoints', () => {
  const pair = makeKey();
  assert.throws(() => createAgtClient({
    submitUrl: 'http://agt.example.test/submit',
    statusUrlTemplate: 'https://agt.example.test/status/{requestID}',
    privateKey: pair.privateKey,
    fetchImpl: async () => ({})
  }), /must use HTTPS/);
});
