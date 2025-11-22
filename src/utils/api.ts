/* eslint-disable no-empty */
import axios from 'axios';

// Base URL for the API
const baseURL = 'https://influbackendfinal-ws2bi.ondigitalocean.app/api';

// Keys for storage
const LS_KEY = 'auth_token';
const SS_KEY = 'auth_token_session';

export function getStoredToken(): string | null {
  return (
    localStorage.getItem(LS_KEY) ||
    sessionStorage.getItem(SS_KEY) ||
    null
  );
}

export function storeToken(token: string, persistent: boolean = true) {
  try {
    // Clear any previous values
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
    if (persistent) {
      localStorage.setItem(LS_KEY, token);
    } else {
      sessionStorage.setItem(SS_KEY, token);
    }
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
  } catch {}
}

// Axios instance
export const api = axios.create({ baseURL });

// Attach Authorization header on each request if token exists
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally by clearing token (optional redirect handled by caller)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(err);
  }
);

export default api;