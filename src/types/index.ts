export type Role = 'PM' | 'INTERNAL' | 'CLIENT';
export type Department = 'UIUX' | 'FRONTEND' | 'BACKEND';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Department | null;
  avatarUrl: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  user: { id: string; name: string; role: Role; department: Department | null };
}

export interface ClientProjectSummary {
  id: string;
  name: string;
  description: string | null;
  percentComplete: number;
  totalTasks: number;
  completedTasks: number;
}

export interface TaskDependencyRef {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  isInternal?: boolean;
  author?: { id: string; name: string };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** Omitted entirely in Client Guest responses — an internal identity per the brief. */
  department?: Department;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatarUrl: string | null; department: Department } | null;
  isClientVisible?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  blockedBy: TaskDependencyRef[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
}

export interface AuditLogEntry {
  id: string;
  taskId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  changedColumn: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string; role: Role };
}

export interface PaginatedResult<T> {
  entries: T[];
  totalData: number;
  totalPage: number;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}
