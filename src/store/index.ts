import { configureStore } from "@reduxjs/toolkit";
import languageReducer from "./slices/languageSlice";
import chatReducer from "./slices/chatSlice";
import authReducer from "./slices/authSlice";
import preferencesReducer from "./slices/preferencesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    language: languageReducer,
    chat: chatReducer,
    preferences: preferencesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;