export type LanguageCode = string;
export type Language = LanguageCode;

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface LanguageState {
  currentLanguage: LanguageCode;
}

const initialState: LanguageState = {
  currentLanguage: "hi",
};

const languageSlice = createSlice({
  name: "language",
  initialState,

  reducers: {
    setLanguage: (
      state,
      action: PayloadAction<LanguageCode>
    ) => {
      state.currentLanguage = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;

export default languageSlice.reducer;