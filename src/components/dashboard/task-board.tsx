'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/use-projects';
import { useTasks, useUpdateTaskStatus } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';
import type { TaskStatus, User } from '@/types';
import { CreateProjectDialog } from './create-project-dialog';
import { CreateTaskDialog } from './create-task-dialog';
import { type InternalTask, TaskCard } from './task-card';
import { TaskDetailDialog } from './task-detail-dialog';

// Phones stack the columns; tablets keep them side by side at a fixed Trello-like width and
// scroll sideways instead of squeezing the cards; from `lg` three equal columns fit.
const BOARD_GRID =
  'grid gap-5 md:max-lg:auto-cols-[minmax(17rem,1fr)] md:max-lg:grid-flow-col md:max-lg:overflow-x-auto md:max-lg:pb-2 lg:grid-cols-3';

const COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: 'TODO', label: 'To Do', dot: 'bg-muted-foreground' },
  { status: 'IN_PROGRESS', label: 'In Progress', dot: 'bg-warning' },
  { status: 'DONE', label: 'Done', dot: 'bg-success' },
];

export function TaskBoard({ currentUser }: { currentUser: User }) {
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const isPm = currentUser.role === 'PM';

  const projects = projectsData?.entries ?? [];
  const activeProjectId = selectedProjectId ?? projects[0]?.id;
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError,
  } = useTasks({ projectId: activeProjectId, rows: 100 });
  const updateStatus = useUpdateTaskStatus();

  if (projectsLoading) {
    return <BoardSkeleton />;
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[21px] font-bold tracking-tight">Task Board</h1>
          {isPm && <CreateProjectDialog />}
        </div>
        <EmptyState
          title="No projects yet"
          description={
            isPm
              ? 'Create a project to start assigning tasks.'
              : 'Ask a Product Manager to add you to a project.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[21px] font-bold tracking-tight">Task Board</h1>
          {projects.length === 1 && activeProject && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeProject.name}
            </span>
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          {projects.length > 1 && (
            <Select value={activeProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="col-span-2 w-full sm:w-56">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isPm && activeProjectId && (
            <CreateTaskDialog projectId={activeProjectId} triggerClassName="w-full sm:w-auto" />
          )}
          {isPm && <CreateProjectDialog triggerClassName="w-full sm:w-auto" />}
        </div>
      </div>

      {tasksLoading ? (
        <BoardSkeleton />
      ) : isError ? (
        <EmptyState title="Couldn't load tasks" description="Something went wrong, please retry." />
      ) : (
        <div className={BOARD_GRID}>
          {COLUMNS.map((column) => {
            const tasksInColumn = (tasksData?.entries ?? []).filter(
              (t): t is InternalTask => t.status === column.status && t.department !== undefined,
            );
            return (
              <div
                key={column.status}
                className="space-y-3.5 rounded-2xl bg-muted p-4 md:min-h-[calc(100dvh-12rem)]"
              >
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                    <span className={cn('size-2 rounded-full', column.dot)} />
                    {column.label}
                  </h2>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    {tasksInColumn.length}
                  </span>
                </div>
                <div className="space-y-3.5">
                  {tasksInColumn.length === 0 && (
                    <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No tasks
                    </p>
                  )}
                  {tasksInColumn.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUser={currentUser}
                      isUpdating={updateStatus.isPending}
                      onOpenDetail={() => setSelectedTaskId(task.id)}
                      onStatusChange={(status) =>
                        updateStatus.mutate({ id: task.id, status, version: task.version })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailDialog
        taskId={selectedTaskId}
        currentUser={currentUser}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className={BOARD_GRID}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3.5 rounded-2xl bg-muted p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
