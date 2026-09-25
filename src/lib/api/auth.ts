import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';

export interface AuthResponse {
  token: string;
  user: User;
}

export function login(input: { email: string; password: string }) {
  return apiClient.post<AuthResponse>('/auth/login', input).then((r) => r.data);
}

export function register(input: {
  email: string;
  password: string;
  name: string;
  role: 'PM' | 'INTERNAL' | 'CLIENT';
  department?: 'UIUX' | 'FRONTEND' | 'BACKEND';
}) {
  return apiClient.post<AuthResponse>('/auth/register', input).then((r) => r.data);
}

export function logout() {
  return apiClient.post('/auth/logout').then((r) => r.data);
}

export function getMe() {
  return apiClient.get<User>('/auth/me').then((r) => r.data);
}
