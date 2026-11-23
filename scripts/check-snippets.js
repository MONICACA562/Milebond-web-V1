/**
 * Verifies that the canonical disclaimer text in content/milebond-snippets.json
 * appears verbatim in the pages that render it. Run: node scripts/check-snippets.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const snippets = require(path.join(root, 'content', 'milebond-snippets.json'));

const expected = [
  { id: 'MILEBOND_QC_FIRST_RUN_STANDARD', file: 'services/kitting-assembly.html', min: 2 },
  { id: 'MILEBOND_COMPONENT_MOQ_STANDARD', file: 'services/kitting-assembly.html', min: 2 },
  { id: 'MILEBOND_SOURCING_FEASIBILITY_LIMIT', file: 'services/kitting-assembly.html', min: 1 },
  { id: 'MILEBOND_COMPLIANCE_RESPONSIBILITY', file: 'services/kitting-assembly.html', min: 1 },
  { id: 'MILEBOND_SUPPLIER_QUALITY_RESPONSIBILITY', file: 'services/kitting-assembly.html', min: 1 },
  { id: 'MILEBOND_SUPPLIER_CONFIDENTIALITY_LIMIT', file: 'services/kitting-assembly.html', min: 1 },
  { id: 'MILEBOND_AMAZON_SERVICE_SCOPE', file: 'services/kitting-assembly.html', min: 2 }
];

let failed = 0;
for (const item of expected) {
  const text = snippets[item.id];
  if (!text) {
    console.error('MISSING DEFINITION: ' + item.id);
    failed++;
    continue;
  }
  const html = fs.readFileSync(path.join(root, item.file), 'utf8');
  const count = html.split(text).length - 1;
  if (count < item.min) {
    console.error(
      'MISSING: ' + item.id + ' in ' + item.file + ' (found ' + count + ', expected >= ' + item.min + ')'
    );
    failed++;
  }
}

const jsonLdFiles = ['services/kitting-assembly.html', 'services/sourcing-fees-pricing.html'];
for (const file of jsonLdFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) {
    console.error('NO JSON-LD: ' + file);
    failed++;
    continue;
  }
  blocks.forEach((block, index) => {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      console.error('INVALID JSON-LD in ' + file + ' block ' + (index + 1) + ': ' + error.message);
      failed++;
    }
  });
}

if (failed) {
  console.error('\nSnippet check failed: ' + failed + ' issue(s).');
  process.exit(1);
}
console.log('Snippet check passed.');
