import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: "admin" | "owner";
}

interface AdminAuthResponse {
  accessToken: string;
  admin: AdminAccount;
}

interface AdminAuthContextValue {
  admin: AdminAccount | null;
  accessToken: string | null;
  loading: boolean;
  connectionError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  request: <T,>(path: string, init?: RequestInit) => Promise<T>;
  retry: () => void;
}

const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5001").replace(/\/+$/, "");
const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
let refreshRequest: Promise<AdminAuthResponse> | null = null;

class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const readResponse = async <T,>(response: Response): Promise<T> => {
  let body: { error?: string } & T;
  try {
    body = await response.json() as { error?: string } & T;
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) {
    throw new AdminApiError(body.error || "Admin sign-in failed.", response.status);
  }
  return body;
};

const refreshAdminSession = (): Promise<AdminAuthResponse> => {
  if (!refreshRequest) {
    refreshRequest = fetch(`${apiUrl}/api/v1/admin/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => readResponse<AdminAuthResponse>(response))
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setConnectionError("");
    refreshAdminSession()
      .then((session) => {
        if (!mounted) return;
        setAdmin(session.admin);
        setAccessToken(session.accessToken);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
          setAdmin(null);
          setAccessToken(null);
          return;
        }
        setConnectionError(error instanceof Error ? error.message : "Could not connect to the admin service.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [retryCount]);

  const login = async (email: string, password: string) => {
    setConnectionError("");
    const response = await fetch(`${apiUrl}/api/v1/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const session = await readResponse<AdminAuthResponse>(response);
    setAdmin(session.admin);
    setAccessToken(session.accessToken);
    setConnectionError("");
  };

  const logout = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/logout`, {
        method: "POST",
        credentials: "include",
      });
      await readResponse<{ success: true }>(response);
    } finally {
      setAdmin(null);
      setAccessToken(null);
    }
  };

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const send = (token: string | null) => fetch(`${apiUrl}/api/v1/admin${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    let response = await send(accessToken);
    if (response.status === 401) {
      try {
        const session = await refreshAdminSession();
        setAdmin(session.admin);
        setAccessToken(session.accessToken);
        response = await send(session.accessToken);
      } catch (error) {
        if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
          setAdmin(null);
          setAccessToken(null);
        }
        throw error;
      }
    }
    return readResponse<T>(response);
  }, [accessToken]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    admin,
    accessToken,
    loading,
    connectionError,
    login,
    logout,
    request,
    retry: () => setRetryCount((count) => count + 1),
  }), [admin, accessToken, loading, connectionError, request]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  return context;
}
