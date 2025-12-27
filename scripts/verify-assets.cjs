/* Verify that dist/index.html references vendor-react, vendor-antd, and index- assets,
  and that those assets exist in dist/assets. Exits 1 on mismatch to fail the workflow. */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'dist', 'index.html');
const assetsDir = path.join(process.cwd(), 'dist', 'assets');

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) fail('dist/index.html not found');
if (!fs.existsSync(assetsDir)) fail('dist/assets directory not found');

const html = fs.readFileSync(indexPath, 'utf8');
const assets = fs.readdirSync(assetsDir);

const required = ['vendor-react', 'vendor-antd', 'index-'];
for (const k of required) {
  if (!html.includes(k)) fail(`index.html missing reference to pattern: ${k}`);
  const exists = assets.some(f => f.startsWith(k) && f.endsWith('.js'));
  if (!exists) fail(`dist/assets missing JavaScript file for pattern: ${k}`);
}

console.log('✓ Built assets verified: index.html references and dist/assets presence confirmed');