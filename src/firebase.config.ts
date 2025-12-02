export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'databaseURL', 'storageBucket', 'messagingSenderId', 'appId'];

const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase credentials:', missingKeys);
  console.error('📝 Add these to your .env.local file:');
  missingKeys.forEach(key => console.error(` VITE_FIREBASE_${key.toUpperCase()}=your_value`));
}
