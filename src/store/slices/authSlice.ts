import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>,
    ) => {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      state.isLoading = false;
    },
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.isLoading = false;
    },
  },
});

export const { setCredentials, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
