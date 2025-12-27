import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import eventsReducer from './slices/eventsSlice';
import registrationsReducer from './slices/registrationsSlice';
import teamsReducer from './slices/teamsSlice';
import announcementsReducer from './slices/announcementsSlice';
import themeReducer from './slices/themeSlice';
import cartReducer from './slices/cartSlice';
import uiReducer from './slices/uiSlice';
import { firebaseCartService } from '../services/firebaseCart';
import type { CartItem } from './slices/cartSlice';
import { setItems } from './slices/cartSlice';

export const store = configureStore({
  reducer: {
    announcements: announcementsReducer,
    auth: authReducer,
    chat: chatReducer,
    events: eventsReducer,
    registrations: registrationsReducer,
    cart: cartReducer,
    teams: teamsReducer,
    theme: themeReducer,
    ui: uiReducer,
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

// Persist cart to server for logged-in users and load server cart on login
let prevAuthUid: string | null = null;
let prevCartJson = JSON.stringify(store.getState().cart.items);

store.subscribe(() => {
  const state = store.getState();
  const authUid = state.auth.user?.uid || null;

  // On login (authUid changed), fetch server cart and replace local cart
  if (authUid && authUid !== prevAuthUid) {
    (async () => {
      try {
        const serverItems = await firebaseCartService.getCart(authUid);
        if (serverItems && Array.isArray(serverItems) && serverItems.length > 0) {
          store.dispatch(setItems(serverItems as CartItem[]));
        }
      } catch (e) {
        console.error('Error loading server cart on login', e);
      }
    })();
  }

  // If cart changed and user is logged in, save to server
  const currentCartJson = JSON.stringify(state.cart.items);
  if (authUid && currentCartJson !== prevCartJson) {
    (async () => {
      try {
        await firebaseCartService.saveCart(authUid, state.cart.items as CartItem[]);
      } catch (e) {
        console.error('Error saving cart to server', e);
      }
    })();
  }

  prevAuthUid = authUid;
  prevCartJson = currentCartJson;
});