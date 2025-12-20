export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
    createdAt?: number;
}
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    role: string;
    memberSinceYear: number | null;
}
export declare const setUser: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    user: any;
    role?: string;
    createdAt?: number;
}, "auth/setUser">, logout: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"auth/logout">, setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "auth/setLoading">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "auth/setError">;
declare const _default: import("redux").Reducer<AuthState>;
export default _default;
