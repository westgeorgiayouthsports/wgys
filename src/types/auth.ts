import type { User as FirebaseUser } from 'firebase/auth';
import type { UserRole } from './enums/auth';
export type { UserRole };

export interface User extends FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  role: UserRole;
}
