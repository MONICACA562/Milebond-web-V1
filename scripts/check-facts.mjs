#!/usr/bin/env node
/* Milebond multilingual fact and SEO checker.
   Run: node scripts/check-facts.mjs
   Exit code 1 when a blocking error is found.

   Checks
   1. data/i18n-pages.json is valid and every live translation resolves to a file.
   2. Live localised pages have the right html lang, self canonical and reciprocal hreflang.
   3. sitemap.xml lists every live translation and no planned or draft page.
   4. Legacy or unapproved commercial claims do not appear in published copy.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.milebond.com';
const REGISTRY = path.join(ROOT, 'data', 'i18n-pages.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');

const errors = [];
const warnings = [];
let checks = 0;

const pass = (msg) => { checks++; };
const fail = (msg) => { checks++; errors.push(msg); };
const warn = (msg) => { checks++; warnings.push(msg); };
const ok = (cond, msg) => { cond ? pass(msg) : fail(msg); };

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail(`${path.relative(ROOT, file)} is not valid JSON: ${e.message}`); return null; }
}

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (['node_modules', 'blog-next', '.git', 'preview', '.wrangler', 'screenshots', 'downloads', 'docs'].includes(name)) continue;
    if (entry.isDirectory()) {
      if (name === 'draft' || name.startsWith('_draft')) continue;
      walkHtml(path.join(dir, name), out);
    } else if (name.endsWith('.html')) {
      out.push(path.join(dir, name));
    }
  }
  return out;
}

function resolvePage(pagePath) {
  if (!pagePath) return null;
  if (pagePath === '/') return path.join(ROOT, 'index.html');
  const clean = pagePath.replace(/\/+$/, '');
  const candidates = [
    path.join(ROOT, clean + '.html'),
    path.join(ROOT, clean, 'index.html'),
    path.join(ROOT, clean)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function alternatesIn(html) {
  return [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/g)].map(m => m[0]).map(tag => ({
    hreflang: (tag.match(/hreflang="([^"]+)"/) || [])[1] || '',
    href: (tag.match(/href="([^"]+)"/) || [])[1] || ''
  }));
}

// ---------- 1. Registry ----------
const registry = readJson(REGISTRY);
const liveLocales = [];
if (registry) {
  const locales = registry.locales || {};
  const validStatus = new Set(['live', 'planned', 'draft']);
  Object.entries(locales).forEach(([code, cfg]) => {
    ok(/^[a-z]{2}$/.test(code), `locale code "${code}" is a two-letter code`);
    ok(validStatus.has(cfg.status), `locale "${code}" status "${cfg.status}" is valid`);
    if (cfg.status === 'live') liveLocales.push(code);
  });
  ok(liveLocales.includes(registry.defaultLocale), `defaultLocale "${registry.defaultLocale}" is live`);

  liveLocales.forEach(code => {
    const home = locales[code].home;
    ok(!!resolvePage(home), `live locale "${code}" home ${home} resolves to a file`);
  });

  const seen = new Set();
  (registry.pages || []).forEach(page => {
    const translations = page.translations || {};
    ok(!!translations[registry.defaultLocale], `page "${page.id}" has a ${registry.defaultLocale} master`);
    Object.entries(translations).forEach(([code, cfg]) => {
      ok(!!locales[code], `page "${page.id}" locale "${code}" is registered`);
      ok(validStatus.has(cfg.status), `page "${page.id}" ${code} status is valid`);
      const key = cfg.path.replace(/\/+$/, '') || '/';
      ok(!seen.has(key), `path ${cfg.path} is unique`);
      seen.add(key);
      if (cfg.status === 'live') {
        const file = resolvePage(cfg.path);
        ok(!!file, `live page ${cfg.path} resolves to a file`);
        if (file) {
          const html = fs.readFileSync(file, 'utf8');
          if (code !== registry.defaultLocale) {
            const lang = (html.match(/<html[^>]*\slang="([^"]+)"/) || [])[1];
            ok(lang === locales[code].htmlLang, `${cfg.path} html lang is "${locales[code].htmlLang}" (found "${lang || 'none'}")`);
          }
          const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
          ok(canonical === ORIGIN + cfg.path, `${cfg.path} canonical is self-referencing`);

          if (code !== registry.defaultLocale) {
            const alts = alternatesIn(html);
            liveLocales.forEach(sib => {
              const sibCfg = (registry.pages.find(p => p.id === page.id) || {}).translations || {};
              if (!sibCfg[sib] || sibCfg[sib].status !== 'live') return;
              const target = ORIGIN + sibCfg[sib].path;
              ok(alts.some(a => a.hreflang === locales[sib].htmlLang && a.href === target),
                `${cfg.path} has hreflang ${locales[sib].htmlLang} -> ${sibCfg[sib].path}`);
              const sibFile = resolvePage(sibCfg[sib].path);
              if (sibFile) {
                const sibAlts = alternatesIn(fs.readFileSync(sibFile, 'utf8'));
                ok(sibAlts.some(a => a.hreflang === locales[code].htmlLang && a.href === ORIGIN + cfg.path),
                  `${sibCfg[sib].path} links back with hreflang ${locales[code].htmlLang}`);
              }
            });
            const defaultCfg = translations[registry.defaultLocale];
            if (defaultCfg) {
              ok(alts.some(a => a.hreflang === 'x-default' && a.href === ORIGIN + defaultCfg.path),
                `${cfg.path} x-default points to the ${registry.defaultLocale} master`);
            }
          }
        }
      }
    });
  });
}

// ---------- 2. Sitemap ----------
let sitemapLocs = new Set();
if (fs.existsSync(SITEMAP)) {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  sitemapLocs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  ok(sitemapLocs.size > 0, 'sitemap.xml contains URLs');
} else {
  fail('sitemap.xml is missing');
}
if (registry) {
  (registry.pages || []).forEach(page => {
    Object.entries(page.translations || {}).forEach(([, cfg]) => {
      const url = ORIGIN + cfg.path;
      if (cfg.status === 'live') ok(sitemapLocs.has(url), `sitemap lists live page ${cfg.path}`);
      else ok(!sitemapLocs.has(url), `sitemap excludes ${cfg.status} page ${cfg.path}`);
    });
  });
}

// ---------- 3. Claim scan ----------
const files = walkHtml(ROOT);
const editorialScope = (rel) => {
  const clean = rel.replace(/\\/g, '/');
  return !clean.includes('/products/');
};
const claimRules = [
  { id: 'legacy 3-8% fee', re: /3\s*[–\-]\s*8\s*%/, scope: 'all' },
  {
    id: 'competitor fee range',
    re: /5\s*[–\-]\s*8\s*%|8\s*[–\-]\s*12\s*%/,
    scope: 'editorial',
    requires: /(fee|commission|service charge)/i,
    excludes: /(defect|error rate|failure rate|energy|equipment|SiO2|B2O3|CaO|Na2O|save|saving)/i
  },
  { id: 'auditor USD 250-350', re: /\$\s?250\s*[–\-]\s*350/, scope: 'all' },
  { id: '50-set MOQ claim', re: /custom kitting from 50 sets|starts at 50 sets|50-set MOQ/i, scope: 'all' },
  { id: 'USD 100 trial claim', re: /(\$|USD\s?)100[^.<]{0,40}trial|trial[^.<]{0,40}(\$|USD\s?)100/i, scope: 'all' }
];

const excluded = new Set(['index-legacy.html', 'thank-you.html', '404.html']);
files.forEach(file => {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (excluded.has(path.basename(file))) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    claimRules.forEach(rule => {
      if (rule.scope === 'editorial' && !editorialScope(rel)) return;
      if (rule.requires && !rule.requires.test(line)) return;
      if (rule.excludes && rule.excludes.test(line)) return;
      if (rule.re.test(line)) fail(`${rule.id} at ${rel}:${index + 1}`);
    });
  });
});

// ---------- 4. Fact drift ----------
const brandCounts = new Set();
files.forEach(file => {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (excluded.has(path.basename(file))) return;
  const html = fs.readFileSync(file, 'utf8');
  [...html.matchAll(/(\d{2})\+ Amazon brands/g)].forEach(m => brandCounts.add(m[1]));
});
if (brandCounts.size > 1 || (brandCounts.size === 1 && !brandCounts.has('40'))) {
  warn(`Amazon brand counts in use: ${[...brandCounts].map(v => v + '+').join(', ')} (Master Facts marks this as an unresolved conflict)`);
}

const llms = path.join(ROOT, 'llms.txt');
if (fs.existsSync(llms) && /Custom runs start at 50 pcs/i.test(fs.readFileSync(llms, 'utf8'))) {
  warn('llms.txt still says "Custom runs start at 50 pcs", which conflicts with the MOQ rule (owner approval pending)');
}

// Positive fact checks on the two fee-bearing master pages.
const kitting = path.join(ROOT, 'services', 'kitting-assembly.html');
if (fs.existsSync(kitting)) {
  const html = fs.readFileSync(kitting, 'utf8');
  ok(html.includes('USD 50'), 'kitting page states USD 50');
  ok(/QC report/i.test(html), 'kitting page states that a QC report is included');
}
const pricing = path.join(ROOT, 'services', 'sourcing-fees-pricing.html');
if (fs.existsSync(pricing)) {
  ok(fs.readFileSync(pricing, 'utf8').includes('USD 50'), 'pricing page states USD 50');
}

// ---------- Report ----------
console.log('Milebond i18n fact check');
console.log(`  pages scanned: ${files.length}`);
console.log(`  live locales: ${liveLocales.join(', ') || 'none'}`);
console.log(`  checks: ${checks}`);
warnings.forEach(w => console.log('  WARN  ' + w));
errors.forEach(e => console.log('  FAIL  ' + e));
console.log(`Result: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
