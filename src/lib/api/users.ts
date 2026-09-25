import { apiClient } from '@/lib/api-client';
import type { PaginatedResult, User } from '@/types';

export function listUsers() {
  return apiClient
    .get<PaginatedResult<User>>('/users', { params: { rows: 200 } })
    .then((r) => r.data);
}
