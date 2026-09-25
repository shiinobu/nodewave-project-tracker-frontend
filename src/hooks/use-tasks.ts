import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TaskListParams } from '@/lib/api/tasks';
import {
  addAttachment,
  addComment,
  addDependency,
  createTask,
  deleteTask,
  getTask,
  listAuditLogs,
  listTasks,
  updateTask,
  updateTaskStatus,
} from '@/lib/api/tasks';
import { getApiErrorMessage, isConflictError } from '@/lib/api-client';
import type { Department, TaskStatus } from '@/types';

const TASKS_KEY = ['tasks'] as const;

export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: [...TASKS_KEY, params],
    queryFn: () => listTasks(params),
    enabled: !!params.projectId,
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, taskId],
    queryFn: () => getTask(taskId as string),
    enabled: !!taskId,
  });
}

export function useAuditLogs(taskId: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, taskId, 'audit-logs'],
    queryFn: () => listAuditLogs(taskId as string),
    enabled: !!taskId,
  });
}

/**
 * Board lists, a single task and its audit trail all hang off the ['tasks'] key, so one
 * prefix invalidation keeps them in step. A narrower key (say, per project) misses the
 * single-task and history queries and leaves an open dialog on a stale `version`, so its
 * next save conflicts with the user's own change.
 */
function useTaskCache() {
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: TASKS_KEY });
  };

  return {
    refresh,
    fail: (error: unknown) => {
      toast.error(getApiErrorMessage(error));
      // Someone else changed the task first: reload it so the next attempt carries the
      // current version instead of failing the same way again.
      if (isConflictError(error)) refresh();
    },
  };
}

export function useUpdateTaskStatus() {
  const cache = useTaskCache();

  return useMutation({
    mutationFn: ({ id, status, version }: { id: string; status: TaskStatus; version: number }) =>
      updateTaskStatus(id, { status, version }),
    onSuccess: cache.refresh,
    onError: cache.fail,
  });
}

export function useUpdateTask() {
  const cache = useTaskCache();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      title?: string;
      description?: string;
      assigneeId?: string | null;
      isClientVisible?: boolean;
      version: number;
    }) => updateTask(id, input),
    onSuccess: () => {
      cache.refresh();
      toast.success('Task updated');
    },
    onError: cache.fail,
  });
}

export function useAddDependency() {
  const cache = useTaskCache();

  return useMutation({
    mutationFn: ({ id, dependsOnTaskId }: { id: string; dependsOnTaskId: string }) =>
      addDependency(id, dependsOnTaskId),
    onSuccess: () => {
      cache.refresh();
      toast.success('Dependency added');
    },
    onError: cache.fail,
  });
}

export function useCreateTask() {
  const cache = useTaskCache();

  return useMutation({
    mutationFn: (input: {
      projectId: string;
      title: string;
      description?: string;
      department: Department;
      assigneeId?: string;
      isClientVisible?: boolean;
      dependsOnTaskIds?: string[];
    }) => createTask(input),
    onSuccess: () => {
      cache.refresh();
      toast.success('Task created');
    },
    onError: cache.fail,
  });
}

export function useAddComment(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body: string; isInternal?: boolean }) =>
      addComment(taskId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, taskId] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useAddAttachment(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { fileName: string; fileUrl: string }) =>
      addAttachment(taskId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TASKS_KEY, taskId] });
      toast.success('Attachment added');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteTask() {
  const cache = useTaskCache();

  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => deleteTask(id, version),
    onSuccess: () => {
      cache.refresh();
      toast.success('Task deleted');
    },
    onError: cache.fail,
  });
}
