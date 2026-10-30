#!/usr/bin/env node
/**
 * IndexNow one-click pusher for milebond.com
 *
 * Usage:
 *   node scripts/indexnow.mjs                  # URLs changed in the last commit
 *   node scripts/indexnow.mjs <url> [url...]   # specific URLs
 *   node scripts/indexnow.mjs --all            # every URL in sitemap.xml
 *   node scripts/indexnow.mjs --dry-run ...    # print, do not submit
 *
 * Notes:
 *   - The key file (<32 hex>.txt) must sit in the repo root and be deployed.
 *   - Google does not support IndexNow; use Search Console for Google.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOST = 'www.milebond.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useAll = args.includes('--all');
const explicit = args.filter((a) => !a.startsWith('--'));

function findKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim();
  const file = fs
    .readdirSync(ROOT)
    .find((name) => /^[a-f0-9]{32}\.txt$/i.test(name));
  if (!file) {
    throw new Error(
      'IndexNow key file not found. Add a <32-hex>.txt file to the repo root or set INDEXNOW_KEY.'
    );
  }
  return fs.readFileSync(path.join(ROOT, file), 'utf8').trim();
}

function fileToUrl(file) {
  const p = file.replace(/\\/g, '/');
  if (!p.endsWith('.html')) return null;
  if (/^(assets|downloads|images|scripts|\.)/.test(p)) return null;
  if (p === 'index.html') return `https://${HOST}/`;
  if (p.endsWith('/index.html')) {
    return `https://${HOST}/${p.slice(0, -'index.html'.length)}`;
  }
  return `https://${HOST}/${p.replace(/\.html$/, '')}`;
}

function urlsFromLastCommit() {
  let out = '';
  try {
    out = execSync('git show --name-only --pretty=format: HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
    });
  } catch {
    throw new Error('Not a git repository, or git is not available.');
  }
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(fileToUrl)
    .filter(Boolean);
}

function urlsFromSitemap() {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function normalize(urls) {
  return [...new Set(urls)]
    .map((u) => u.trim())
    .filter((u) => u.startsWith(`https://${HOST}/`));
}

async function submit(urlList, key) {
  const keyLocation = `https://${HOST}/${key}.txt`;
  const batchSize = 1000;
  for (let i = 0; i < urlList.length; i += batchSize) {
    const batch = urlList.slice(i, i + batchSize);
    const body = JSON.stringify({ host: HOST, key, keyLocation, urlList: batch });
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    });
    console.log(
      `Submitted ${batch.length} URL(s) -> HTTP ${res.status} ${res.statusText || ''}`.trim()
    );
    if (!res.ok) {
      console.error(await res.text());
      process.exitCode = 1;
    }
  }
}

const raw = useAll
  ? urlsFromSitemap()
  : explicit.length
    ? explicit
    : urlsFromLastCommit();

const urls = normalize(raw);

if (!urls.length) {
  console.log('No URLs to submit.');
  process.exit(0);
}

console.log(`IndexNow: ${urls.length} URL(s)`);
urls.forEach((u) => console.log('  ' + u));

if (dryRun) {
  console.log('Dry run — nothing submitted.');
  process.exit(0);
}

const key = findKey();
await submit(urls, key);
