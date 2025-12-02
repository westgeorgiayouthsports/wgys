import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  timestamp: string;
  read: boolean;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(m => m.id !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setLoading, setMessages, addMessage, deleteMessage, setError } = chatSlice.actions;

export default chatSlice.reducer;
