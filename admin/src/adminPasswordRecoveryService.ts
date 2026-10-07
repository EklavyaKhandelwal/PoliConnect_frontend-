const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5001").replace(/\/+$/, "");

const postRecoveryRequest = async (
  path: string,
  body: { email: string; code?: string; password?: string },
): Promise<void> => {
  const response = await fetch(`${apiUrl}/api/v1/admin/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let result: { error?: string };
  try {
    result = await response.json() as { error?: string };
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) throw new Error(result.error || "Admin password recovery failed.");
};

export const requestAdminPasswordRecovery = (email: string): Promise<void> =>
  postRecoveryRequest("forgot-password", { email });

export const resetAdminPassword = (details: {
  email: string;
  code: string;
  password: string;
}): Promise<void> => postRecoveryRequest("reset-password", details);
