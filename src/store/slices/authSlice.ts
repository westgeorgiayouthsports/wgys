import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  role: 'user',
  memberSinceYear: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: any; role?: string; createdAt?: number }>) => {
      if (action.payload.user) {
        // Extract only serializable data from Firebase user
        state.user = {
          uid: action.payload.user.uid,
          email: action.payload.user.email,
          displayName: action.payload.user.displayName,
          photoURL: action.payload.user.photoURL,
          createdAt: action.payload.createdAt,
        };
        state.isAuthenticated = true;
        // Calculate member since year from createdAt timestamp
        state.memberSinceYear = action.payload.createdAt ? new Date(action.payload.createdAt).getFullYear() : null;
      } else {
        state.user = null;
        state.isAuthenticated = false;
        state.memberSinceYear = null;
      }
      state.role = action.payload.role || 'user';
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.role = 'user';
      state.memberSinceYear = null;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
