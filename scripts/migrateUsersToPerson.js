import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

// Migration: populate users_to_person/{uid} -> personId for existing people with a linked userId
// This script uses the Firebase Admin SDK. Provide a service account JSON via
// SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS, or place a file at ./service-account.json.
// Usage:
// 1) Ensure service account file is available and DATABASE URL is set in .env.local
// 2) Install deps: `npm install firebase-admin dotenv`
// 3) Run: `node scripts/migrateUsersToPerson.js`

dotenv.config({ path: '.env.local' });

function initAdmin() {
  const svcPath = process.env.SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  if (svcPath && fs.existsSync(svcPath)) {
    try {
      const cred = JSON.parse(fs.readFileSync(svcPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
      });
      return;
    } catch (e) {
      console.error('Failed to init admin with service account:', e);
      process.exit(1);
    }
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
    });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK. Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_PATH to a service account JSON. ' + e);
    process.exit(1);
  }
}

async function migrate() {
  initAdmin();
  const db = admin.database();
  const peopleRef = db.ref('people');
  const snap = await peopleRef.once('value');
  if (!snap.exists()) {
    console.log('No people found');
    return;
  }

  const people = snap.val();
  let mapped = 0;
  for (const [personId, val] of Object.entries(people)) {
    const person = val;
    if (person && person.userId) {
      const uid = person.userId;
      const mapRef = db.ref(`users_to_person/${uid}`);
      await mapRef.set(personId);
      console.log(`Mapped ${uid} -> ${personId}`);
      mapped++;
    }
  }

  console.log(`Migration complete. Mapped ${mapped} users.`);
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
