// Hardened server-side URL status checker.
// Validates every hop, pins DNS resolution, blocks private/reserved networks,
// follows only a small number of redirects, and never downloads response bodies.

import { getStore } from '@netlify/blobs';
import ipaddr from 'ipaddr.js';
import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';

const MAX_URL_LENGTH = 2048;
const MAX_BODY_BYTES = 4096;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 8000;
const TOTAL_TIMEOUT_MS = 12000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;
const ALLOWED_PORTS = new Set(['', '80', '443']);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

async function rateLimited(req) {
  try {
    const digest = createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 32);
    const store = getStore('http-status-rate-limits');
    const key = `v1-${digest}`;
    const now = Date.now();
    const current = (await store.get(key, { type: 'json' })) || { start: now, count: 0 };
    if (!Number.isFinite(current.start) || now - current.start >= RATE_WINDOW_MS) {
      current.start = now;
      current.count = 0;
    }
    current.count += 1;
    await store.set(key, JSON.stringify(current));
    return current.count > RATE_LIMIT;
  } catch (error) {
    // A temporary storage outage should not make the tool unavailable.
    console.warn('status-check rate limit unavailable', error?.message);
    return false;
  }
}

function normalizeAndValidate(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > MAX_URL_LENGTH) {
    throw new Error('INVALID_URL');
  }
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('INVALID_URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSUPPORTED_PROTOCOL');
  if (url.username || url.password) throw new Error('CREDENTIALS_NOT_ALLOWED');
  if (!url.hostname || !ALLOWED_PORTS.has(url.port)) throw new Error('PORT_NOT_ALLOWED');

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.lan')
  ) {
    throw new Error('PRIVATE_DESTINATION');
  }
  url.hash = '';
  return url;
}

function isPublicAddress(address) {
  let parsed;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  return parsed.range() === 'unicast';
}

async function resolvePublic(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(hostname)) {
    if (!isPublicAddress(hostname)) throw new Error('PRIVATE_DESTINATION');
    const parsed = ipaddr.parse(hostname);
    return { address: hostname, family: parsed.kind() === 'ipv4' ? 4 : 6 };
  }
  let records;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('DNS_FAILED');
  }
  if (!records.length || records.some(record => !isPublicAddress(record.address))) {
    throw new Error('PRIVATE_DESTINATION');
  }
  return records[0];
}

function requestHeaders(url) {
  return {
    'user-agent': 'Fawran-Status-Checker/1.0 (+https://fawran.tools)',
    accept: '*/*',
    connection: 'close',
    host: url.host,
  };
}

async function requestOnce(url, method, deadline) {
  if (Date.now() >= deadline) throw new Error('TIMEOUT');
  const resolved = await resolvePublic(url);
  const client = url.protocol === 'https:' ? https : http;

  return await new Promise((resolve, reject) => {
    let settled = false;
    const remaining = Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()));
    const req = client.request(url, {
      method,
      headers: {
        ...requestHeaders(url),
        ...(method === 'GET' ? { range: 'bytes=0-0' } : {}),
      },
      maxHeaderSize: 16 * 1024,
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [resolved]);
        else callback(null, resolved.address, resolved.family);
      },
    }, response => {
      if (settled) return;
      settled = true;
      // Status checking needs headers only. Destroying immediately imposes an
      // effective zero-byte body limit, even if a server ignores HEAD/Range.
      response.destroy();
      resolve({
        status: response.statusCode || 0,
        statusText: response.statusMessage || '',
        location: response.headers.location || null,
        contentType: response.headers['content-type'] || null,
        contentLength: response.headers['content-length'] || null,
      });
    });
    req.setTimeout(remaining, () => req.destroy(new Error('TIMEOUT')));
    req.on('error', error => {
      if (settled) return;
      settled = true;
      if (error?.message !== 'TIMEOUT') {
        console.warn('status-check upstream request failed', error?.code || error?.message);
      }
      reject(error?.message === 'TIMEOUT' ? error : new Error('REQUEST_FAILED'));
    });
    req.end();
  });
}

async function inspect(initialUrl) {
  const started = Date.now();
  const deadline = started + TOTAL_TIMEOUT_MS;
  let current = initialUrl;
  const redirects = [];

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response = await requestOnce(current, 'HEAD', deadline);
    if ([405, 501].includes(response.status)) {
      response = await requestOnce(current, 'GET', deadline);
    }

    if (response.status >= 300 && response.status < 400 && response.location) {
      if (hop === MAX_REDIRECTS) throw new Error('TOO_MANY_REDIRECTS');
      let next;
      try {
        next = normalizeAndValidate(new URL(response.location, current).href);
      } catch (error) {
        throw error;
      }
      // Validate DNS before recording/following the redirect.
      await resolvePublic(next);
      redirects.push({ status: response.status, url: current.href, location: next.href });
      current = next;
      continue;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      finalUrl: current.href,
      redirected: redirects.length > 0,
      redirects,
      contentType: response.contentType,
      contentLength: response.contentLength,
      responseTimeMs: Date.now() - started,
    };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

const PUBLIC_ERRORS = {
  INVALID_URL: ['Enter a complete, valid URL.', 'أدخل رابطًا كاملًا وصحيحًا.'],
  UNSUPPORTED_PROTOCOL: ['Only HTTP and HTTPS URLs are supported.', 'تُقبل روابط HTTP وHTTPS فقط.'],
  CREDENTIALS_NOT_ALLOWED: ['URLs containing credentials are not allowed.', 'لا يُسمح بروابط تحتوي على بيانات دخول.'],
  PORT_NOT_ALLOWED: ['Only standard web ports are allowed.', 'يُسمح بمنافذ الويب القياسية فقط.'],
  PRIVATE_DESTINATION: ['Private or reserved network destinations are not allowed.', 'لا يُسمح بعناوين الشبكات الخاصة أو المحجوزة.'],
  DNS_FAILED: ['The hostname could not be resolved.', 'تعذر العثور على اسم النطاق.'],
  TIMEOUT: ['The target did not respond before the timeout.', 'لم يستجب الموقع قبل انتهاء المهلة.'],
  TOO_MANY_REDIRECTS: ['The URL has too many redirects.', 'يحتوي الرابط على عدد كبير من عمليات إعادة التوجيه.'],
  REQUEST_FAILED: ['The target could not be reached safely.', 'تعذر الوصول إلى الموقع بأمان.'],
};

export default async req => {
  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'POST' });
  }
  const length = Number(req.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) return json({ error: 'BODY_TOO_LARGE' }, 413);
  if (await rateLimited(req)) {
    return json({ error: 'RATE_LIMITED', message: 'Too many checks. Please try again later.' }, 429, {
      'retry-after': String(Math.ceil(RATE_WINDOW_MS / 1000)),
    });
  }

  let body;
  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return json({ error: 'BODY_TOO_LARGE' }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'INVALID_BODY', message: 'A JSON body is required.' }, 400);
  }

  try {
    const target = normalizeAndValidate(body?.url);
    return json(await inspect(target));
  } catch (error) {
    const code = PUBLIC_ERRORS[error?.message] ? error.message : 'REQUEST_FAILED';
    const lang = req.headers.get('accept-language')?.toLowerCase().startsWith('ar') ? 1 : 0;
    const status = ['INVALID_URL', 'UNSUPPORTED_PROTOCOL', 'CREDENTIALS_NOT_ALLOWED', 'PORT_NOT_ALLOWED', 'PRIVATE_DESTINATION'].includes(code) ? 400 : 502;
    return json({ error: code, message: PUBLIC_ERRORS[code][lang] }, status);
  }
};

export const config = { path: '/api/http-status' };
