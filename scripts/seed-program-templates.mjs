import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

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
    process.exit(2);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  const db = admin.database();

  const defaults = [
    { sportId: 'baseball', name: 'Recreation', programType: 'recreation', description: 'Baseball recreation program', defaultBaseFee: 0, active: true },
    { sportId: 'softball', name: 'Recreation', programType: 'recreation', description: 'Softball recreation program', defaultBaseFee: 0, active: true },
  ];

  for (const d of defaults) {
    const id = `${slugify(d.name)}-${d.programType}`;
    const ref = db.ref(`programTemplates/${id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) {
      const now = new Date().toISOString();
      await ref.set({ ...d, createdAt: now, updatedAt: now });
      console.log('Created', id);
    } else {
      console.log('Exists', id);
    }
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
