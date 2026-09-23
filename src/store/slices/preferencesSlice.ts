import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface PreferencesState {
  autoPlay: boolean;
  playbackSpeed: number;
  voiceName: string;
  highlight: boolean;
  preview: boolean;
  autoSend: boolean;
  largeText: boolean;
  vibration: boolean;
}

const defaults: PreferencesState = {
  autoPlay: true,
  playbackSpeed: 1,
  voiceName: "",
  highlight: true,
  preview: true,
  autoSend: false,
  largeText: false,
  vibration: true,
};

const loadPreferences = (): PreferencesState => {
  try {
    const saved = localStorage.getItem("citizen-app-preferences");
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState: typeof window === "undefined" ? defaults : loadPreferences(),
  reducers: {
    setPreference: <K extends keyof PreferencesState>(
      state: PreferencesState,
      action: PayloadAction<{ key: K; value: PreferencesState[K] }>,
    ) => {
      state[action.payload.key] = action.payload.value;
      localStorage.setItem("citizen-app-preferences", JSON.stringify(state));
    },
  },
});

export const { setPreference } = preferencesSlice.actions;
export default preferencesSlice.reducer;
