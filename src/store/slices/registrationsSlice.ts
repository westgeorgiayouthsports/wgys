import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Registration } from '../../services/firebaseRegistrations';
import { registrationsService } from '../../services/firebaseRegistrations';

export interface RegistrationsState {
  registrations: Registration[];
  loading: boolean;
  error: string | null;
}

const initialState: RegistrationsState = {
  registrations: [],
  loading: false,
  error: null,
};

export const fetchTeamRegistrations = createAsyncThunk(
  'registrations/fetchTeamRegistrations',
  async (teamId: string) => {
    return await registrationsService.getTeamRegistrations(teamId);
  }
);

export const fetchAllRegistrations = createAsyncThunk(
  'registrations/fetchAllRegistrations',
  async () => {
    return await registrationsService.getAllRegistrations();
  }
);

const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    setRegistrations: (state, action: PayloadAction<Registration[]>) => {
      state.registrations = action.payload;
    },
    addRegistration: (state, action: PayloadAction<Registration>) => {
      state.registrations.push(action.payload);
    },
    updateRegistration: (state, action: PayloadAction<Registration>) => {
      const index = state.registrations.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.registrations[index] = action.payload;
      }
    },
    removeRegistration: (state, action: PayloadAction<string>) => {
      state.registrations = state.registrations.filter(r => r.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamRegistrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamRegistrations.fulfilled, (state, action) => {
        state.loading = false;
        state.registrations = action.payload;
      })
      .addCase(fetchTeamRegistrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch registrations';
      })
      .addCase(fetchAllRegistrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllRegistrations.fulfilled, (state, action) => {
        state.loading = false;
        state.registrations = action.payload;
      })
      .addCase(fetchAllRegistrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch registrations';
      });
  },
});

export const { setRegistrations, addRegistration, updateRegistration, removeRegistration, clearError } = registrationsSlice.actions;
export default registrationsSlice.reducer;
