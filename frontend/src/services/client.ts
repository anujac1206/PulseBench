import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('token');
}

// One fetch wrapper - attaches JWT automatically, throws on non-2xx.
export async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function saveAuth(token: string) {
  localStorage.setItem('token', token);
}

export function clearAuth() {
  localStorage.removeItem('token');
}

export function isLoggedIn() {
  return !!getToken();
}

// One shared socket instance for the whole app.
export const socket = io(API_URL, { autoConnect: false });
