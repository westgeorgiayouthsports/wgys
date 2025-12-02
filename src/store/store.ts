import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import eventsReducer from './slices/eventsSlice';
import registrationsReducer from './slices/registrationsSlice';
import teamsReducer from './slices/teamsSlice';
import announcementsReducer from './slices/announcementsSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    announcements: announcementsReducer,
    auth: authReducer,
    chat: chatReducer,
    events: eventsReducer,
    registrations: registrationsReducer,
    teams: teamsReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;