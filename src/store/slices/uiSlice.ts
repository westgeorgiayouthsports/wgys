import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CustomRange {
  from: string | null; // ISO date
  to: string | null;   // ISO date
}

interface UIState {
  websiteViewsRange: number;
  customRange: CustomRange | null;
  showMyMenuItems: boolean;
  debugLogging: boolean;
}

const initialState: UIState = {
  websiteViewsRange: 30,
  customRange: null,
  showMyMenuItems: true,
  debugLogging: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setWebsiteViewsRange(state, action: PayloadAction<number>) {
      state.websiteViewsRange = action.payload;
      // clear customRange when picking a preset
      state.customRange = null;
    },
    setWebsiteCustomRange(state, action: PayloadAction<CustomRange | null>) {
      state.customRange = action.payload;
      // when custom range is set, represent it by 0 (custom) in the numeric range
      if (action.payload) state.websiteViewsRange = 0;
    },
    setShowMyMenuItems(state, action: PayloadAction<boolean>) {
      state.showMyMenuItems = action.payload;
    },
    setDebugLogging(state, action: PayloadAction<boolean>) {
      state.debugLogging = action.payload;
    },
  },
});

export const { setWebsiteViewsRange, setWebsiteCustomRange } = uiSlice.actions;
export const { setShowMyMenuItems, setDebugLogging } = uiSlice.actions;
export default uiSlice.reducer;
