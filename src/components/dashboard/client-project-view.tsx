'use client';

import {
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  ClipboardList,
  Clock,
  Lock,
  type LucideIcon,
  Paperclip,
  Share2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import {
  type ActivityEvent,
  type ActivityKind,
  buildActivity,
  groupByDay,
  progressSummary,
} from '@/lib/client-summary';
import { clockTime, timeAgo } from '@/lib/time';
import { cn, isSafeUrl } from '@/lib/utils';
import type { ClientProjectSummary, Task } from '@/types';

type GroupKey = 'progress' | 'next' | 'done';

const GROUPS: { key: GroupKey; label: string; dot: string }[] = [
  { key: 'progress', label: 'In progress', dot: 'bg-warning' },
  { key: 'next', label: 'Up next', dot: 'bg-muted-foreground' },
  { key: 'done', label: 'Completed', dot: 'bg-success' },
];

function groupOf(task: Task): GroupKey {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'IN_PROGRESS') return 'progress';
  return 'next';
}

export function ClientProjectView() {
  const { data, isLoading, isError } = useProjects();
  const projects = (data?.entries ?? []) as ClientProjectSummary[];

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <ProjectSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="mx-auto max-w-5xl rounded-2xl border border-dashed p-10 text-center text-sm text-destructive">
        Couldn&apos;t load your project. Please refresh and try again.
      </p>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-dashed p-12 text-center">
        <p className="font-heading text-lg font-semibold">No project yet</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You&apos;ll see your project here once a Product Manager adds you to one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-20 pb-10">
      {projects.map((project) => (
        <ProjectStatus key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectStatus({ project }: { project: ClientProjectSummary }) {
  const { data, isLoading, isError } = useTasks({ projectId: project.id, rows: 100 });
  const tasks = data?.entries ?? [];

  const grouped: Record<GroupKey, Task[]> = { progress: [], next: [], done: [] };
  for (const task of tasks) grouped[groupOf(task)].push(task);
  grouped.progress.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  grouped.done.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  grouped.next.sort((a, b) => Number(a.isBlocked) - Number(b.isBlocked));

  const lastUpdate = tasks.reduce<string | null>(
    (latest, t) => (latest === null || t.updatedAt > latest ? t.updatedAt : latest),
    null,
  );

  const complete = project.totalTasks > 0 && project.percentComplete === 100;
  const summary = progressSummary({
    done: grouped.done.length,
    inProgress: grouped.progress.length,
    next: grouped.next.length,
  });
  const activity = buildActivity(tasks);

  const statusPanel = isLoading ? (
    <Skeleton className="h-64 rounded-2xl" />
  ) : isError ? (
    <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-destructive">
      Couldn&apos;t load the shared tasks. Please refresh and try again.
    </p>
  ) : null;

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span>Projects</span>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span aria-current="page" className="text-secondary-foreground">
            {project.name}
          </span>
        </nav>

        <div className="space-y-3">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-secondary-foreground">
            <span className={cn('size-1.5 rounded-full', complete ? 'bg-success' : 'bg-primary')} />
            {complete ? 'Completed' : 'Active project'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {project.name}
          </h1>
          {project.description && (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Tabs defaultValue="tasks" className="min-w-0 gap-6">
          <TabsList variant="line" className="w-full justify-start gap-6 border-b">
            <TabsTrigger value="tasks" className="flex-none px-1 text-sm">
              Shared tasks
              {!isLoading && (
                <span className="font-mono text-xs text-muted-foreground">{tasks.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-none px-1 text-sm">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            {statusPanel ??
              (tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-12 text-center">
                  <p className="font-heading text-lg font-semibold">Nothing shared yet</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Your project manager hasn&apos;t shared any tasks for this project yet.
                  </p>
                </div>
              ) : (
                GROUPS.filter((g) => grouped[g.key].length > 0).map((g) => (
                  <section key={g.key} className="overflow-hidden rounded-2xl border bg-card">
                    <header className="flex items-center gap-2.5 border-b px-4 py-4 sm:px-6">
                      <span className={cn('size-2 rounded-full', g.dot)} />
                      <h2 className="text-sm font-semibold">{g.label}</h2>
                      <span className="font-mono text-xs text-muted-foreground">
                        {grouped[g.key].length}
                      </span>
                    </header>
                    <ul className="divide-y">
                      {grouped[g.key].map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </ul>
                  </section>
                ))
              ))}
          </TabsContent>

          <TabsContent value="activity">
            {statusPanel ?? <ActivityPanel events={activity} />}
          </TabsContent>
        </Tabs>

        <aside className="order-first rounded-2xl border bg-card p-6 lg:sticky lg:top-24 lg:order-last">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Overall progress
          </p>
          <div className="mt-5 flex flex-col items-center">
            <ProgressRing value={project.percentComplete} />
            <p className="mt-4 text-sm font-medium">
              {project.completedTasks} of {project.totalTasks} tasks complete
            </p>
          </div>

          {!isLoading && !isError && (
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              {summary}
            </p>
          )}

          <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3 lg:grid-cols-1">
            <StatRow
              icon={ClipboardList}
              tone="bg-primary/20 text-primary"
              label="Tasks"
              value={`${project.totalTasks} total`}
            />
            <StatRow
              icon={Share2}
              tone="bg-dept-uiux/20 text-dept-uiux"
              label="Shared with you"
              value={
                isLoading
                  ? '…'
                  : isError
                    ? '—'
                    : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`
              }
            />
            <StatRow
              icon={Clock}
              tone="bg-warning/20 text-warning"
              label="Last updated"
              value={lastUpdate ? timeAgo(lastUpdate) : '—'}
              title={lastUpdate ? new Date(lastUpdate).toLocaleString() : undefined}
            />
          </dl>

          {!isLoading && !isError && project.totalTasks > tasks.length && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Progress covers the whole project, including work that isn&apos;t listed here.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function TaskRow({ task }: { task: Task }) {
  const blocked = task.isBlocked && task.status !== 'DONE';
  const Icon =
    task.status === 'DONE'
      ? CheckCircle2
      : blocked
        ? Lock
        : task.status === 'IN_PROGRESS'
          ? CircleDot
          : Circle;
  const tone =
    task.status === 'DONE'
      ? 'text-success'
      : blocked
        ? 'text-blocked'
        : task.status === 'IN_PROGRESS'
          ? 'text-warning'
          : 'text-muted-foreground';
  const latestNote = task.comments[task.comments.length - 1];

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 px-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
      <Icon className={cn('mt-0.5 size-5', tone)} aria-hidden="true" />
      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-[15px] font-semibold leading-snug">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
          )}
        </div>

        {blocked && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-blocked-soft px-2.5 py-1 text-xs font-semibold text-blocked-foreground">
            <Lock className="size-3 text-blocked" aria-hidden="true" />
            {task.blockedBy.length > 0
              ? `Waiting on ${task.blockedBy.map((b) => b.title).join(', ')}`
              : 'Waiting on another task'}
          </p>
        )}

        {latestNote && (
          <figure className="rounded-lg bg-secondary/60 px-3.5 py-2.5">
            <figcaption className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Team update · {timeAgo(latestNote.createdAt)}
            </figcaption>
            <blockquote className="mt-1 text-sm leading-relaxed">{latestNote.body}</blockquote>
          </figure>
        )}

        {task.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {task.attachments.map((file) => (
              <li key={file.id}>
                {isSafeUrl(file.fileUrl) ? (
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Paperclip className="size-3" aria-hidden="true" />
                    {file.fileName}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">
                    <Paperclip className="size-3" aria-hidden="true" />
                    {file.fileName}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="col-start-2 mt-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground sm:col-start-3 sm:row-start-1 sm:mt-0 sm:pt-0.5">
        {timeAgo(task.updatedAt)}
      </span>
    </li>
  );
}

function StatRow({
  icon: Icon,
  tone,
  label,
  value,
  title,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-semibold" title={title}>
          {value}
        </dd>
      </div>
    </div>
  );
}

const ACTIVITY_STYLE: Record<ActivityKind, { node: string; tone: string }> = {
  done: { node: 'border-success', tone: 'text-success' },
  progress: { node: 'border-warning', tone: 'text-warning' },
  planned: { node: 'border-muted-foreground', tone: 'text-muted-foreground' },
  note: { node: 'border-primary', tone: 'text-primary' },
  file: { node: 'border-muted-foreground', tone: 'text-primary' },
};

// The verb carries the colour and the object is bold; there is deliberately no subject,
// because a Client Guest must never be told who did something.
function ActivityText({ event }: { event: ActivityEvent }) {
  const verb = (text: string) => (
    <span className={cn('font-semibold', ACTIVITY_STYLE[event.kind].tone)}>{text}</span>
  );
  const task = <strong className="font-bold">{event.task}</strong>;

  switch (event.kind) {
    case 'done':
      return (
        <>
          {verb('completed')} {task}
        </>
      );
    case 'progress':
      return (
        <>
          {verb('started')} {task}
        </>
      );
    case 'planned':
      return (
        <>
          {verb('planned')} {task}
        </>
      );
    case 'note':
      return (
        <>
          {verb('posted a team update on')} {task}
        </>
      );
    case 'file':
      return (
        <>
          {verb('attached')} <strong className="font-bold">{event.detail}</strong> to {task}
        </>
      );
  }
}

function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="font-heading text-lg font-semibold">No activity yet</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Updates on the tasks shared with you will show up here.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="border-b px-4 py-4 sm:px-6">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Latest updates on the tasks shared with you.
        </p>
      </header>
      <div className="space-y-8 px-4 py-6 sm:px-6">
        {groupByDay(events).map((day) => (
          <div key={day.key}>
            <span
              className={cn(
                'ml-24 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold sm:ml-[7.75rem]',
                day.isToday ? 'bg-accent text-primary' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {day.label}
            </span>
            <ol className="mt-2">
              {day.events.map((event) => (
                <li
                  key={event.id}
                  className="group/item grid grid-cols-[3.75rem_1rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[5rem_1rem_minmax(0,1fr)] sm:gap-x-3.5"
                >
                  <time
                    dateTime={event.at}
                    title={new Date(event.at).toLocaleString()}
                    className={cn(
                      'pt-[1.2rem] text-right font-mono text-[11px]',
                      day.isToday ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {clockTime(event.at)}
                  </time>
                  <div className="relative flex justify-center" aria-hidden="true">
                    {/* The line only ever runs dot to dot: no stub above the first dot or below the last. */}
                    <span className="absolute top-0 h-[1.675rem] w-px bg-border group-first/item:hidden" />
                    <span className="absolute top-[1.675rem] bottom-0 w-px bg-border group-last/item:hidden" />
                    <span
                      className={cn(
                        'relative mt-[1.3rem] size-3 rounded-full border-2 bg-card',
                        ACTIVITY_STYLE[event.kind].node,
                      )}
                    />
                  </div>
                  <div className="min-w-0 space-y-2 border-b py-4 group-last/item:border-b-0">
                    <p className="text-sm leading-relaxed">
                      <ActivityText event={event} />
                    </p>
                    {event.kind === 'note' && event.detail && (
                      <blockquote className="rounded-lg bg-secondary/60 px-3.5 py-2.5 text-sm leading-relaxed">
                        {event.detail}
                      </blockquote>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div
      className="relative size-36"
      role="progressbar"
      aria-label="Overall project progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="2.6"
          className="stroke-secondary"
        />
        {value > 0 && (
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={`${value} ${100 - value}`}
            className="stroke-primary"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-4xl font-bold tabular-nums">
          {value}
          <span className="text-xl text-muted-foreground">%</span>
        </span>
      </div>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
