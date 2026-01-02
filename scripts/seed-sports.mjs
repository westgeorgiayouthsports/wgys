/*
ESM seed script for common sports.
Usage:
  1. Install dependencies: npm install firebase-admin
  2. Ensure .env.local exists in project root with VITE_FIREBASE_DATABASE_URL
  3. Run: node scripts/seed-sports.mjs

This script expects a service account JSON at the path given by SERVICE_ACCOUNT_PATH in .env.local
or at ./service-account.json relative to project root.
*/

import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import fs from 'fs';
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

// Determine service account path
const serviceAccountPathFromEnv = process.env.SERVICE_ACCOUNT_PATH || process.env.SERVICE_ACCOUNT || '';
const defaultSaPath = path.resolve(__dirname, '..', 'service-account.json');
const serviceAccountPath = serviceAccountPathFromEnv ? path.resolve(serviceAccountPathFromEnv) : defaultSaPath;

if (!fs.existsSync(serviceAccountPath)) {
  console.error('service-account.json not found at:', serviceAccountPath);
  process.exit(1);
}

const saRaw = await readFile(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(saRaw);

const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
if (!databaseURL) {
  console.error('FIREBASE_DATABASE_URL or VITE_FIREBASE_DATABASE_URL is required in your environment (.env.local)');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const db = admin.database();

const sports = [
  { name: 'Baseball', ageControlDate: '05-01' },
  { name: 'Softball', ageControlDate: '01-01' },
  { name: 'Softball Travel', ageControlDate: '09-01' },
  { name: 'Soccer', ageControlDate: '01-01' },
  { name: 'Basketball', ageControlDate: '09-01' },
  { name: 'Football', ageControlDate: '09-01' },
];

async function seed() {
  try {
    const ref = db.ref('sports');
    for (const s of sports) {
      const snap = await ref.orderByChild('name').equalTo(s.name).get();
      if (snap.exists()) {
        console.log(`Skipping existing sport: ${s.name}`);
        continue;
      }
      const now = new Date().toISOString();
      const payload = { ...s, createdAt: now, updatedAt: now };
      const res = await ref.push(payload);
      console.log(`Created sport ${s.name} -> ${res.key}`);
    }
    console.log('Seeding complete');
    process.exit(0);
  } catch (e) {
    console.error('Seeding failed', e);
    process.exit(1);
  }
}

await seed();
