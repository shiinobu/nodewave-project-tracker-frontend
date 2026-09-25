import { apiClient } from '@/lib/api-client';
import type { ClientProjectSummary, PaginatedResult, Project, ProjectMember } from '@/types';

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

export function updateProject(id: string, input: { name?: string; description?: string }) {
  return apiClient.patch<Project>(`/projects/${id}`, input).then((r) => r.data);
}

export function addProjectMember(id: string, userId: string) {
  return apiClient.post<ProjectMember>(`/projects/${id}/members`, { userId }).then((r) => r.data);
}

export function removeProjectMember(id: string, userId: string) {
  return apiClient.delete(`/projects/${id}/members/${userId}`).then((r) => r.data);
}
