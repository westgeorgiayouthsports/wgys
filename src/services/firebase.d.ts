import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import type { FirebaseStorage } from 'firebase/storage';
declare const app: import("@firebase/app").FirebaseApp;
export declare const auth: Auth;
export declare const db: Database;
export declare const storage: FirebaseStorage;
export declare const functions: import("@firebase/functions").Functions;
export default app;
