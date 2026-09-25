import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addProjectMember,
  createProject,
  getProject,
  listProjects,
  removeProjectMember,
  updateProject,
} from '@/lib/api/projects';
import { getApiErrorMessage } from '@/lib/api-client';

// The project list and every single project hang off ['projects'], so one prefix
// invalidation keeps the board, the pickers and the members list in step.
const PROJECTS_KEY = ['projects'] as const;

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: listProjects });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: () => getProject(id as string),
    enabled: !!id,
  });
}

function useProjectMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useCreateProject() {
  return useProjectMutation(createProject, 'Project created');
}

export function useUpdateProject(projectId: string) {
  return useProjectMutation(
    (input: { name?: string; description?: string }) => updateProject(projectId, input),
    'Project updated',
  );
}

export function useAddProjectMember(projectId: string) {
  return useProjectMutation(
    (userId: string) => addProjectMember(projectId, userId),
    'Member added',
  );
}

export function useRemoveProjectMember(projectId: string) {
  return useProjectMutation(
    (userId: string) => removeProjectMember(projectId, userId),
    'Member removed',
  );
}
