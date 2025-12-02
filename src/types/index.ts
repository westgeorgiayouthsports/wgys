export * from './auth';
export * from './team';
export * from './cms';
export * from './contact';
export * from './program';
export * from './programForm';
export * from './family';

// Utility Types
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
