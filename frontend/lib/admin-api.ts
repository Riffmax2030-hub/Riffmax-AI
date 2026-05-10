// admin-api.ts — wrapper for /api/admin/* endpoints.
// Stores the admin secret in localStorage and adds the X-Admin-Secret header
// to every request. NEVER includes the secret in URLs or logs.

const SECRET_KEY = "riffmax_admin_secret_v1";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SECRET_KEY);
  } catch {
    return null;
  }
}

export function setAdminSecret(secret: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECRET_KEY, secret);
  } catch {
    // ignore
  }
}

export function clearAdminSecret() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SECRET_KEY);
  } catch {
    // ignore
  }
}

export class AdminAuthError extends Error {
  constructor(message = "Admin auth failed") {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new AdminAuthError("No admin secret configured");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": secret,
      ...(options.headers || {}),
    },
  });

  if (response.status === 403) {
    throw new AdminAuthError("Invalid admin secret");
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Server returned ${response.status}`);
  }

  return response.json();
}
