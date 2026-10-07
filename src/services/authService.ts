import { api, setAccessToken } from "./api";
import type { AuthUser } from "../store/slices/authSlice";

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface Credentials {
  email: string;
  password: string;
}

export const signIn = async (credentials: Credentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/api/v1/user/login", credentials);
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const signUp = async (
  credentials: Credentials & { name: string },
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/api/v1/user/signup", credentials);
  setAccessToken(response.data.accessToken);
  return response.data;
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post("/api/v1/user/forgot-password", { email });
};

export const resetPassword = async (
  details: { email: string; code: string; password: string },
): Promise<void> => {
  await api.post("/api/v1/user/reset-password", details);
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await api.get<{ user: AuthUser }>("/api/v1/user/me");
  return response.data.user;
};

export const signOut = async (): Promise<void> => {
  await api.post("/api/v1/user/logout");
  setAccessToken(null);
};

export const deleteAccount = async (): Promise<void> => {
  await api.delete("/api/v1/user/me");
  setAccessToken(null);
};
