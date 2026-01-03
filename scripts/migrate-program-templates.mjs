import admin from 'firebase-admin';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local if present (simple parser)
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  try {
    const envContent = await readFile(envLocalPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let key = m[1];
      let val = m[2] || '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    });
  } catch (e) {
    console.warn('Failed to parse .env.local:', e);
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function main() {
  const serviceAccountPath = process.env.SERVICE_ACCOUNT || path.resolve('./service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('service-account.json not found at', serviceAccountPath);
    process.exit(2);
  }
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    console.error('FIREBASE_DATABASE_URL or VITE_FIREBASE_DATABASE_URL is required in your environment (.env.local)');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  const db = admin.database();

  // Load existing programTemplates
  const tplSnap = await db.ref('programTemplates').once('value');
  const templates = tplSnap.exists() ? tplSnap.val() : {};

  // Build map of global templates (those without seasonId) keyed by sport|programType|sex
  const globalByKey = new Map();
  for (const [id, tpl] of Object.entries(templates)) {
    if (!tpl || typeof tpl !== 'object') continue;
    if (!tpl.seasonId && !tpl.season) {
      const key = `${tpl.sportId || ''}|${tpl.programType || ''}|${tpl.sex || 'any'}`;
      globalByKey.set(key, id);
    }
  }

  // Helper to create a new global template (idempotent if id exists)
  async function createGlobalTemplateIfNeeded(srcTpl) {
    const key = `${srcTpl.sportId || ''}|${srcTpl.programType || ''}|${srcTpl.sex || 'any'}`;
    if (globalByKey.has(key)) return globalByKey.get(key);

    const base = slugify(`${srcTpl.sportId || 'template'}-${srcTpl.programType || 'template'}`);
    let id = base;
    let suffix = 0;
    while ((await db.ref(`programTemplates/${id}`).once('value')).exists()) {
      suffix += 1;
      id = `${base}-${suffix}`;
    }

    const now = new Date().toISOString();
    const toWrite = { ...srcTpl };
    // Remove season-scoped fields
    delete toWrite.seasonId;
    delete toWrite.season;
    delete toWrite.divisionKey;
    toWrite.createdAt = now;
    toWrite.updatedAt = now;

    await db.ref(`programTemplates/${id}`).set(toWrite);
    globalByKey.set(key, id);
    console.log('Created global template', id);
    return id;
  }

  // Build mapping from oldTemplateId -> newGlobalId
  const mapping = {};
  for (const [id, tpl] of Object.entries(templates)) {
    if (!tpl || typeof tpl !== 'object') continue;
    // If template appears to be season-scoped, migrate
    if (tpl.seasonId || tpl.season) {
      const newId = await createGlobalTemplateIfNeeded(tpl);
      mapping[id] = newId;
    }
  }

  // Update seasonPrograms entries to point to new template ids
  const spSnap = await db.ref('seasonPrograms').once('value');
  const sps = spSnap.exists() ? spSnap.val() : {};
  for (const [id, sp] of Object.entries(sps)) {
    if (!sp || typeof sp !== 'object') continue;
    const cur = sp.programId;
    if (mapping[cur]) {
      await db.ref(`seasonPrograms/${id}`).update({ programId: mapping[cur], updatedAt: new Date().toISOString() });
      console.log(`Updated seasonProgram ${id}: ${cur} -> ${mapping[cur]}`);
    }
  }

  // Update discounts that reference old template ids in allowedProgramTemplateIds
  const discSnap = await db.ref('discounts').once('value');
  const discounts = discSnap.exists() ? discSnap.val() : {};
  for (const [id, disc] of Object.entries(discounts)) {
    if (!disc || typeof disc !== 'object') continue;
    const allowed = disc.allowedProgramTemplateIds;
    if (Array.isArray(allowed)) {
      let changed = false;
      const newAllowed = allowed.map(a => mapping[a] || a);
      for (let i = 0; i < allowed.length; i++) if (allowed[i] !== newAllowed[i]) changed = true;
      if (changed) {
        await db.ref(`discounts/${id}`).update({ allowedProgramTemplateIds: newAllowed, updatedAt: new Date().toISOString() });
        console.log(`Updated discount ${id} allowedProgramTemplateIds`);
      }
    }
  }

  console.log('Migration complete. Mapping sample:', Object.entries(mapping).slice(0, 10));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
