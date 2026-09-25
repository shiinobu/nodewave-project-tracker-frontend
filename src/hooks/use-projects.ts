import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createProject, getProject, listProjects } from '@/lib/api/projects';
import { getApiErrorMessage } from '@/lib/api-client';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: listProjects });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProject(id as string),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
