import { createSelector } from 'reselect';
import type { RootState } from '../store';
import type { AuthState, User } from '../slices/authSlice';

const selectAuthState = (state: RootState): AuthState => state.auth;

export const selectUser = createSelector(
  [selectAuthState],
  (auth): User | null => auth.user
);

export const selectRole = createSelector(
  [selectAuthState],
  (auth) => auth.role
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading
);

export const selectIsAdmin = createSelector(
  [selectRole],
  (role) => role === 'admin' || role === 'owner'
);
