import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { eventsService, Event } from '../../services/firebaseEvents';

interface EventsState {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
};

export const fetchTeamEvents = createAsyncThunk(
  'events/fetchTeamEvents',
  async (teamId: string) => {
    return await eventsService.getTeamEvents(teamId);
  }
);

export const fetchAllEvents = createAsyncThunk(
  'events/fetchAllEvents',
  async () => {
    return await eventsService.getAllEvents();
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents: (state, action: PayloadAction<Event[]>) => {
      state.events = action.payload;
    },
    addEvent: (state, action: PayloadAction<Event>) => {
      state.events.push(action.payload);
    },
    updateEvent: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    removeEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(e => e.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchTeamEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      })
      .addCase(fetchAllEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchAllEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      });
  },
});

export const { setEvents, addEvent, updateEvent, removeEvent, clearError } = eventsSlice.actions;
export default eventsSlice.reducer;
