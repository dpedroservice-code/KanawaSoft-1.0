'use strict';

const { signJwsPayload, loadSoftwarePrivateKey } = require('./jws');

function requiredUrl(value, name) {
  if (!value) throw new Error(name + ' is not configured.');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(name + ' must use HTTPS.');
  }
  return url.toString();
}

function createAgtClient(options = {}) {
  const submitUrl = requiredUrl(options.submitUrl || process.env.KANAWA_AGT_SUBMIT_URL, 'KANAWA_AGT_SUBMIT_URL');
  const statusTemplate = options.statusUrlTemplate || process.env.KANAWA_AGT_STATUS_URL_TEMPLATE;
  if (!statusTemplate) throw new Error('KANAWA_AGT_STATUS_URL_TEMPLATE is not configured.');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('This Node.js runtime must provide fetch().');

  const privateKey = options.privateKey || loadSoftwarePrivateKey();
  const headers = Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, options.headers || {});
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 15000);

  async function request(url, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch (_) { throw new Error('AGT returned a non-JSON response (HTTP ' + response.status + ').'); }
      if (!response.ok) {
        const error = new Error('AGT request failed with HTTP ' + response.status + '.');
        error.httpStatus = response.status;
        error.response = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async submitDocument(document) {
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new TypeError('Fiscal document must be a JSON object.');
      }
      const jwsDocumentSignature = signJwsPayload(document, privateKey);
      const result = await request(submitUrl, Object.assign({}, document, { jwsDocumentSignature }));
      if (!result || (typeof result.requestID !== 'string' && typeof result.requestID !== 'number')) {
        const error = new Error('AGT response did not contain requestID; submission outcome requires manual reconciliation.');
        error.response = result;
        error.outcomeUnknown = true;
        throw error;
      }
      return { requestID: String(result.requestID), response: result };
    },

    async getDocumentStatus(requestID) {
      const id = String(requestID || '').trim();
      if (!id) throw new Error('requestID is required to query AGT status.');
      const url = requiredUrl(
        statusTemplate.replace('{requestID}', encodeURIComponent(id)),
        'KANAWA_AGT_STATUS_URL_TEMPLATE'
      );
      const result = await request(url);
      if (!result || result.resultCode === undefined || result.resultCode === null) {
        throw new Error('AGT status response does not contain resultCode.');
      }
      // Preserve the official numeric/string code and complete response. Do not guess its meaning.
      return { requestID: id, resultCode: result.resultCode, response: result };
    }
  };
}

module.exports = { createAgtClient };
