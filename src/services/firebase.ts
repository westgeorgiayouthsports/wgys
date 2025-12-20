import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import type { FirebaseStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '../firebase.config';

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions = getFunctions(app);

// Enable auth persistence so user stays logged in after refresh
setPersistence(auth, browserLocalPersistence).catch((error) => {
  const sanitizedError = (error?.code || 'Unknown error').replace(/[\r\n]/g, '');
  console.error('Failed to set persistence:', sanitizedError);
});

export default app;
