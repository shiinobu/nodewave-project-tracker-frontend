import axios from 'axios';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiErrorBody } from '@/types';

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BE_URL}/api`,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clear();
      queryClient.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** 409 from the API's optimistic lock: the record changed since the client last read it. */
export function isConflictError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
