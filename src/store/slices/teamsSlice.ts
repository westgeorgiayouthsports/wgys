import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { SeasonType } from '../../types/season';

export interface Team {
  id: string;
  name: string;
  budget: number;
  spent: number;
  status: 'active' | 'inactive' | 'archived';
  userId: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
  coachId?: string; // head coach
  teamManagerId?: string;
  assistantCoachIds?: string[];
  rosterAthleteIds?: string[];
  programId?: string;
  seasonId?: string; // Reference to Season document
  season?: SeasonType;
  year?: number;
  ageGroup?: string; // e.g., "10U", "12U"
}

export interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTeams: (state, action: PayloadAction<Team[]>) => {
      state.teams = action.payload;
    },
    addTeam: (state, action: PayloadAction<Team>) => {
      state.teams.push(action.payload);
    },
    updateTeam: (state, action: PayloadAction<Team>) => {
      const index = state.teams.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.teams[index] = action.payload;
      }
    },
    deleteTeam: (state, action: PayloadAction<string>) => {
      state.teams = state.teams.filter(t => t.id !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLoading,
  setTeams,
  addTeam,
  updateTeam,
  deleteTeam,
  setError,
} = teamsSlice.actions;

export default teamsSlice.reducer;
