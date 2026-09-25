import { apiClient } from '@/lib/api-client';
import type {
  AuditLogEntry,
  PaginatedResult,
  Task,
  TaskAttachment,
  TaskComment,
  TaskStatus,
} from '@/types';

/**
 * Standard filters/searchFilters/rangedFilters/orderKey/orderRule/page/rows query
 * contract: JSON-encode the object filters before sending as query params.
 */
export interface TaskListParams {
  projectId?: string;
  filters?: Record<string, unknown>;
  searchFilters?: Record<string, unknown>;
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: 'asc' | 'desc';
}

export function listTasks(params: TaskListParams = {}) {
  const { filters, searchFilters, projectId, ...rest } = params;
  const mergedFilters = projectId ? { ...filters, projectId } : filters;

  return apiClient
    .get<PaginatedResult<Task>>('/tasks', {
      params: {
        ...rest,
        filters: mergedFilters ? JSON.stringify(mergedFilters) : undefined,
        searchFilters: searchFilters ? JSON.stringify(searchFilters) : undefined,
      },
    })
    .then((r) => r.data);
}

export function getTask(id: string) {
  return apiClient.get<Task>(`/tasks/${id}`).then((r) => r.data);
}

export function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  department: 'UIUX' | 'FRONTEND' | 'BACKEND';
  assigneeId?: string;
  isClientVisible?: boolean;
  dependsOnTaskIds?: string[];
}) {
  return apiClient.post<Task>('/tasks', input).then((r) => r.data);
}

export function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string;
    assigneeId?: string | null;
    isClientVisible?: boolean;
    version: number;
  },
) {
  return apiClient.patch<Task>(`/tasks/${id}`, input).then((r) => r.data);
}

export function updateTaskStatus(id: string, input: { status: TaskStatus; version: number }) {
  return apiClient.patch<Task>(`/tasks/${id}/status`, input).then((r) => r.data);
}

export function addDependency(id: string, dependsOnTaskId: string) {
  return apiClient.post(`/tasks/${id}/dependencies`, { dependsOnTaskId }).then((r) => r.data);
}

export function listAuditLogs(id: string) {
  return apiClient
    .get<{ entries: AuditLogEntry[] }>(`/tasks/${id}/audit-logs`)
    .then((r) => r.data.entries);
}

export function addComment(id: string, input: { body: string; isInternal?: boolean }) {
  return apiClient.post<TaskComment>(`/tasks/${id}/comments`, input).then((r) => r.data);
}

export function addAttachment(id: string, input: { fileName: string; fileUrl: string }) {
  return apiClient.post<TaskAttachment>(`/tasks/${id}/attachments`, input).then((r) => r.data);
}

export function deleteTask(id: string, version: number) {
  return apiClient.delete(`/tasks/${id}`, { params: { version } }).then((r) => r.data);
}
