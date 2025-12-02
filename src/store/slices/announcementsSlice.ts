import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  userId: string;
  userEmail: string;
  authorEmail: string;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
  views: number;
  showOnFeed?: boolean;
  allowComments?: boolean;
  commentCount?: number;
}

interface AnnouncementsState {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
}

const initialState: AnnouncementsState = {
  announcements: [],
  loading: false,
  error: null,
};

const announcementsSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAnnouncements: (state, action: PayloadAction<Announcement[]>) => {
      state.announcements = action.payload;
    },
    addAnnouncement: (state, action: PayloadAction<Announcement>) => {
      state.announcements.unshift(action.payload);
    },
    updateAnnouncement: (state, action: PayloadAction<Announcement>) => {
      const index = state.announcements.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.announcements[index] = action.payload;
      }
    },
    deleteAnnouncement: (state, action: PayloadAction<string>) => {
      state.announcements = state.announcements.filter(a => a.id !== action.payload);
    },
    incrementViews: (state, action: PayloadAction<string>) => {
      const announcement = state.announcements.find(a => a.id === action.payload);
      if (announcement) {
        announcement.views += 1;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLoading,
  setAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  incrementViews,
  setError,
} = announcementsSlice.actions;

export default announcementsSlice.reducer;