// ============================================================
// SHARED API CLIENT
// Attaches the JWT automatically and handles 401 responses
// by logging the user out (clearing the session).
// ============================================================
const TOKEN_KEY = "token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getApiUrl() {
  return `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
}

// 401 handler — set by App via configureAuthHandler to avoid
// a circular import with the auth context.
let onUnauthorized = null;

export function configureAuthHandler(callback) {
  onUnauthorized = callback;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Some error pages return non-JSON
  }

  if (!response.ok || (data && data.success === false)) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data,
    );
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (path) => request(path, { method: "DELETE" }),
};
