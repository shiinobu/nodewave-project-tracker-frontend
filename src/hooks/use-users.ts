import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@/lib/api/users';

export function useUsers(enabled = true) {
  return useQuery({ queryKey: ['users'], queryFn: listUsers, enabled });
}
