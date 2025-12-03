export declare const signUpWithEmail: (email: string, password: string, displayName: string) => Promise<import("@firebase/auth").User>;
export declare const signInWithEmail: (email: string, password: string) => Promise<import("@firebase/auth").UserCredential>;
export declare const signInWithGoogle: () => Promise<import("@firebase/auth").User>;
export declare const signOut: () => Promise<void>;
export declare const getUserRole: (uid: string) => Promise<string>;
export declare const onAuthStateChangedListener: (callback: (user: any) => void) => import("@firebase/util").Unsubscribe;
