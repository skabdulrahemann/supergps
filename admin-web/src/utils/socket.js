import { io } from 'socket.io-client';

export function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl?.startsWith('http')) {
    return new URL(apiBaseUrl).origin;
  }

  return window.location.origin;
}

export function createTrackingSocket() {
  const token = localStorage.getItem('token');
  return io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 3,
  });
}
