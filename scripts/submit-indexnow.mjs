#!/usr/bin/env node
/** Notify IndexNow participants after the updated site is deployed.
 *
 * Usage:
 *   npm run seo:indexnow -- --dry-run
 *   npm run seo:indexnow
 *   npm run seo:indexnow -- https://fawran.tools/tools/word-counter
 *
 * This does not submit to Google's general indexing API. Google discovers the
 * same URLs through sitemap.xml and crawlable internal links.
 */

import { readFile } from 'node:fs/promises';

const HOST = 'fawran.tools';
const SITE = `https://${HOST}`;
const DEFAULT_KEY = '030a1a45e8fbdfb365af16f0fb746cef';
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyLocation = `${SITE}/${key}.txt`;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const explicitUrls = args.filter(arg => !arg.startsWith('--'));

function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== HOST) {
    throw new Error(`IndexNow URL must belong to ${SITE}: ${value}`);
  }
  url.hash = '';
  return url.href;
}

async function sitemapUrls() {
  const xml = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => validateUrl(match[1]));
}

const urls = [...new Set(explicitUrls.length ? explicitUrls.map(validateUrl) : await sitemapUrls())];
if (!urls.length) throw new Error('No URLs found to submit.');
if (urls.length > 10_000) throw new Error('IndexNow accepts at most 10,000 URLs per request.');

const payload = { host: HOST, key, keyLocation, urlList: urls };
if (dryRun) {
  console.log(JSON.stringify({ endpoint: 'https://api.indexnow.org/indexnow', ...payload }, null, 2));
  console.log(`Dry run complete: ${urls.length} URL(s). Deploy the key file before a live submission.`);
  process.exit(0);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`IndexNow returned HTTP ${response.status}${body ? `: ${body}` : ''}`);
}
console.log(`IndexNow accepted ${urls.length} URL(s) with HTTP ${response.status}.`);
