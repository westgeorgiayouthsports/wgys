import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import logger from '../../utils/logger';
import type { PaymentPlan } from '../../../src/types/enums/program';

export interface CartItem {
  id: string;
  programId: string;
  programName: string;
  athleteId?: string | null;
  athleteName?: string | null;
  // season id for program's season
  programSeasonId?: string | null;
  price: number;
  quantity: number;
  responses?: any[];
  paymentPlan?: PaymentPlan;
  // program-level metadata moved to Season; cart uses season payment plans
}

export interface CartState {
  items: CartItem[];
}

// initialize from localStorage if present
const LOCAL_KEY = 'wgys_cart_v1';
const loadFromStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch (e) {
    logger.error('Error loading cart from localStorage', e);
    return [];
  }
};

const saveToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch (e) {
    logger.error('Error saving cart to localStorage', e);
  }
};

const initialState: CartState = {
  items: loadFromStorage(),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      state.items.push(action.payload);
      saveToStorage(state.items);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
      saveToStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveToStorage(state.items);
    },
    setItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      saveToStorage(state.items);
    }
  }
});

export const { addItem, removeItem, clearCart, setItems } = cartSlice.actions;
export default cartSlice.reducer;
