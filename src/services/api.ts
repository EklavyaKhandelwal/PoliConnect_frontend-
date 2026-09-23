import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiUrl =
  configuredApiUrl && typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? configuredApiUrl.replace("localhost", window.location.hostname)
    : configuredApiUrl || "http://localhost:5001";

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 120000,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const guestIdKey = "citizen-app-guest-id";
const accessTokenKey = "citizen-app-access-token";
let accessToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem(accessTokenKey) : null;
let refreshRequest: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(accessTokenKey, token);
  else localStorage.removeItem(accessTokenKey);
};

export const getAccessToken = () => accessToken;

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshRequest) {
    refreshRequest = api
      .post<{ accessToken: string }>("/api/v1/user/refresh")
      .then((response) => {
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};

api.interceptors.request.use((config) => {
  const currentToken =
    typeof window !== "undefined" ? localStorage.getItem(accessTokenKey) : accessToken;
  if (currentToken) {
    accessToken = currentToken;
    config.headers.set("Authorization", "Bearer " + currentToken);
  }
  const guestId = localStorage.getItem(guestIdKey);
  if (guestId) config.headers.set("x-guest-id", guestId);
  return config;
});

api.interceptors.response.use(
  (response) => {
    const guestId = response.headers["x-guest-id"];
    if (typeof guestId === "string" && guestId) {
      localStorage.setItem(guestIdKey, guestId);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.endsWith("/user/refresh")
    ) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    const token = await refreshAccessToken();
    if (!token) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-expired"));
      }
      return Promise.reject(error);
    }
    originalRequest.headers.set("Authorization", "Bearer " + token);
    return api(originalRequest);
  },
);