import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { ref, set, get, push, update as _update } from 'firebase/database';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name FIRST, then reload
    await updateProfile(user, { displayName });
    await user.reload();

    // Create user document in Realtime Database
    await set(ref(db, `users/${user.uid}`), {
      uid: user.uid,
      email,
      displayName,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    // Create corresponding People record
    const nameParts = displayName.split(' ');
    const peopleRef = ref(db, 'people');
    const newPersonRef = push(peopleRef);
    await set(newPersonRef, {
      firstName: nameParts[0] || displayName,
      lastName: nameParts.slice(1).join(' ') || '',
      email,
      userId: user.uid,
      hasAccount: true,
      roles: [],
      source: 'signup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.uid,
      isActive: true,
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign up');
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Realtime Database
    const userSnapshot = await get(ref(db, `users/${user.uid}`));
    
    if (!userSnapshot.exists()) {
      // New Google user - create user document
      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || null,
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      // Create corresponding People record
      const displayName = user.displayName || 'User';
      const nameParts = displayName.split(' ');
      const peopleRef = ref(db, 'people');
      const newPersonRef = push(peopleRef);
      await set(newPersonRef, {
        firstName: nameParts[0] || displayName,
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email,
        photoURL: user.photoURL || null,
        userId: user.uid,
        hasAccount: true,
        roles: [],
        source: 'signup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        isActive: true,
      });
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
};

export const getUserRole = async (uid: string): Promise<string> => {
  try {
    const userSnapshot = await get(ref(db, `users/${uid}`));
    return userSnapshot.exists() ? (userSnapshot.val()?.role || 'user') : 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};

export const onAuthStateChangedListener = (callback: (user: any) => void) => {
  return auth.onAuthStateChanged(callback);
};