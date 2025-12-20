import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ChatState {
  messages: Record<string, Message[]>; // keyed by teamId or 'global'
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
}

const initialState: ChatState = {
  messages: { global: [] },
  loading: {},
  error: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // payloads accept { teamId?: string, ... }
    setLoading: (state, action: PayloadAction<{ teamId?: string; loading: boolean }>) => {
      const key = action.payload.teamId || 'global';
      state.loading[key] = action.payload.loading;
    },
    setMessages: (state, action: PayloadAction<{ teamId?: string; messages: Message[] }>) => {
      const key = action.payload.teamId || 'global';
      // Ensure messages are unique by id and sorted by timestamp
      const incoming = action.payload.messages || [];
      const map: Record<string, Message> = {};
      incoming.forEach((m) => {
        map[m.id] = m;
      });
      const unique = Object.values(map).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      state.messages[key] = unique;
    },
    addMessage: (state, action: PayloadAction<{ teamId?: string; message: Message }>) => {
      const key = action.payload.teamId || 'global';
      if (!state.messages[key]) state.messages[key] = [];
      // Avoid adding duplicate messages (may occur with optimistic UI + realtime updates)
      const exists = state.messages[key].some(m => m.id === action.payload.message.id);
      if (!exists) {
        state.messages[key].push(action.payload.message);
        // Keep messages sorted by timestamp
        state.messages[key].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
    },
    deleteMessage: (state, action: PayloadAction<{ teamId?: string; id: string }>) => {
      const key = action.payload.teamId || 'global';
      state.messages[key] = (state.messages[key] || []).filter(m => m.id !== action.payload.id);
    },
    setError: (state, action: PayloadAction<{ teamId?: string; error: string | null }>) => {
      const key = action.payload.teamId || 'global';
      state.error[key] = action.payload.error;
    },
  },
});

export const { setLoading, setMessages, addMessage, deleteMessage, setError } = chatSlice.actions;

export default chatSlice.reducer;
