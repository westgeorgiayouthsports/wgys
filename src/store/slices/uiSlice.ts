import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CustomRange {
  from: string | null; // ISO date
  to: string | null;   // ISO date
}

interface UIState {
  websiteViewsRange: number;
  customRange: CustomRange | null;
}

const initialState: UIState = {
  websiteViewsRange: 30,
  customRange: null,
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
  },
});

export const { setWebsiteViewsRange, setWebsiteCustomRange } = uiSlice.actions;
export default uiSlice.reducer;
