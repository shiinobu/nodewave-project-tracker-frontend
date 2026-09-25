import { apiClient } from '@/lib/api-client';
import type { ClientProjectSummary, PaginatedResult, Project } from '@/types';

export function listProjects() {
  return apiClient
    .get<PaginatedResult<Project | ClientProjectSummary>>('/projects', { params: { rows: 50 } })
    .then((r) => r.data);
}

export function getProject(id: string) {
  return apiClient.get<Project | ClientProjectSummary>(`/projects/${id}`).then((r) => r.data);
}

export function createProject(input: {
  name: string;
  description?: string;
  memberUserIds?: string[];
}) {
  return apiClient.post<Project>('/projects', input).then((r) => r.data);
}

export function deleteProject(id: string) {
  return apiClient.delete(`/projects/${id}`).then((r) => r.data);
}
