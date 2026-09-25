'use client';

import { Check, Lock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DEPARTMENT_STYLES } from '@/lib/department-styles';
import { cn, getInitials } from '@/lib/utils';
import type { Department, Task, TaskStatus, User } from '@/types';

/** The internal/PM board never receives a client-masked task, so department is required here. */
export type InternalTask = Task & { department: Department };

interface ActionState {
  canAct: boolean;
  nextStatus?: TaskStatus;
  nextLabel?: string;
  reason?: string;
}

function getActionState(task: InternalTask, user: User): ActionState {
  if (user.role === 'CLIENT' || task.status === 'DONE') {
    return { canAct: false };
  }

  const nextStatus: TaskStatus = task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE';
  const nextLabel = nextStatus === 'IN_PROGRESS' ? 'Start' : 'Complete';

  // Dependency gate applies to everyone, PM included — it's a data-integrity
  // invariant, not a role permission. Checked first so no role branch can skip it.
  if (nextStatus === 'IN_PROGRESS' && task.isBlocked) {
    return {
      canAct: false,
      nextLabel,
      reason: `Blocked by: ${task.blockedBy.map((b) => b.title).join(', ')}`,
    };
  }

  if (user.role === 'PM') {
    if (nextStatus === 'DONE') {
      return {
        canAct: false,
        nextLabel,
        reason: 'Only the assigned executor can move a task from In Progress to Done',
      };
    }
    return { canAct: true, nextStatus, nextLabel };
  }

  // INTERNAL
  if (user.department !== task.department) {
    return {
      canAct: false,
      nextLabel,
      reason: `Only ${task.department} team members can update this task`,
    };
  }
  if (task.assigneeId && task.assigneeId !== user.id) {
    return { canAct: false, nextLabel, reason: 'Only the assigned executor can update this task' };
  }
  return { canAct: true, nextStatus, nextLabel };
}

export function TaskCard({
  task,
  currentUser,
  onStatusChange,
  onOpenDetail,
  isUpdating,
}: {
  task: InternalTask;
  currentUser: User;
  onStatusChange: (nextStatus: TaskStatus) => void;
  onOpenDetail: () => void;
  isUpdating?: boolean;
}) {
  const action = getActionState(task, currentUser);
  const dept = DEPARTMENT_STYLES[task.department];

  return (
    <Card
      data-testid="task-card"
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        // Keys pressed on the Start/Complete button bubble up to here; they belong to that
        // button, not to the card.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Space would otherwise scroll the board
          onOpenDetail();
        }
      }}
      className={cn(
        'cursor-pointer gap-0 py-0 shadow-sm transition-shadow hover:ring-primary/40',
        task.status === 'DONE' && 'opacity-90',
      )}
    >
      <div className={cn('h-1', dept.bar)} />
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-semibold leading-snug">{task.title}</p>
          <Badge
            className={cn(
              'h-auto px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider',
              dept.badge,
            )}
          >
            {dept.label}
          </Badge>
        </div>

        {task.description && (
          <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
            {task.description}
          </p>
        )}

        {task.isBlocked && (
          <div className="flex items-center gap-1.5 rounded-lg bg-blocked-soft px-2.5 py-2 text-[10.5px] font-semibold text-blocked-foreground">
            <Lock className="size-3 shrink-0 text-blocked" />
            <span>Blocked by {task.blockedBy.map((b) => b.title).join(', ')}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {task.assignee ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Avatar className="size-5.5">
                <AvatarFallback className={cn('font-heading text-[9.5px] font-bold', dept.avatar)}>
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[11px] text-muted-foreground">
                {task.assignee.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] italic text-muted-foreground">Unassigned</span>
          )}

          {action.nextLabel && (
            // A disabled <button> swallows pointer events, so the cursor and the "why is this
            // locked" tooltip live on this wrapper instead.
            <span
              title={action.reason}
              className={cn('inline-flex shrink-0', !action.canAct && 'cursor-not-allowed')}
            >
              <Button
                size="sm"
                variant={action.canAct ? 'default' : 'outline'}
                disabled={!action.canAct || isUpdating}
                title={action.reason}
                className={cn(
                  'h-8 px-4 text-xs max-sm:h-9',
                  action.canAct
                    ? 'bg-warning font-bold text-warning-foreground hover:bg-warning/85'
                    : 'font-semibold text-muted-foreground',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  action.nextStatus && onStatusChange(action.nextStatus);
                }}
              >
                {action.nextLabel}
              </Button>
            </span>
          )}

          {task.status === 'DONE' && (
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-success">
              <Check className="size-3" />
              Done
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
