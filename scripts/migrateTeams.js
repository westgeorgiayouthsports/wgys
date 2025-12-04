import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase Config:', { projectId: firebaseConfig.projectId, databaseURL: firebaseConfig.databaseURL });

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateTeams() {
  const email = await question('Enter admin email: ');
  const password = await question('Enter password: ');
  rl.close();

  console.log('\nAuthenticating...');
  await signInWithEmailAndPassword(auth, email, password);
  console.log('Authenticated successfully\n');

  console.log('Starting teams migration...');

  const teamsRef = ref(db, 'teams');
  const snapshot = await get(teamsRef);

  if (!snapshot.exists()) {
    console.log('No teams found');
    return;
  }

  const teams = snapshot.val();
  const restructured = {};

  Object.entries(teams).forEach(([key, team]) => {
    if (team.id) {
      restructured[team.id] = team;
    } else {
      console.warn(`Team at key ${key} has no id, skipping`);
    }
  });

  console.log(`Migrating ${Object.keys(restructured).length} teams...`);
  
  await set(teamsRef, restructured);
  
  console.log('Migration complete!');
  process.exit(0);
}

migrateTeams().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
