'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/hooks/use-projects';
import {
  useAddAttachment,
  useAddComment,
  useAuditLogs,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from '@/hooks/use-tasks';
import { DEPARTMENT_STYLES } from '@/lib/department-styles';
import { cn, isSafeUrl } from '@/lib/utils';
import type { Project, User } from '@/types';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  isClientVisible: z.boolean(),
});
type EditForm = z.infer<typeof editSchema>;

const commentSchema = z.object({ body: z.string().min(1) });
type CommentForm = z.infer<typeof commentSchema>;

const attachmentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.url('Enter a valid URL'),
});
type AttachmentForm = z.infer<typeof attachmentSchema>;

// Four equal columns that always fit the dialog: short labels and a corner badge on
// phones, full labels with an inline count from `sm` up.
const TAB_TRIGGER = 'px-1 text-xs sm:px-1.5 sm:text-sm';

function TabCount({ value }: { value: number }) {
  return (
    <>
      <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{value}</span>
      {value > 0 && (
        <span className="absolute -top-2.5 right-0 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[9px] font-bold leading-4 text-primary-foreground sm:hidden">
          {value}
        </span>
      )}
    </>
  );
}

export function TaskDetailDialog({
  taskId,
  currentUser,
  onOpenChange,
}: {
  taskId: string | null;
  currentUser: User;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!taskId;
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const { data: project } = useProject(task?.projectId);
  const { data: auditLogs } = useAuditLogs(taskId ?? undefined);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddComment(taskId ?? undefined);
  const addAttachment = useAddAttachment(taskId ?? undefined);

  const isPm = currentUser.role === 'PM';

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const commentForm = useForm<CommentForm>({ resolver: zodResolver(commentSchema) });
  const attachmentForm = useForm<AttachmentForm>({ resolver: zodResolver(attachmentSchema) });
  const [commentIsInternal, setCommentIsInternal] = useState(true);

  // TanStack Query's default structural sharing keeps `task`'s reference stable across
  // background refetches that return identical data, so this only re-fires on a real change
  // (a different task, or a field actually changing) — never wiping an in-progress edit.
  useEffect(() => {
    if (task) {
      editForm.reset({
        title: task.title,
        description: task.description ?? '',
        assigneeId: task.assigneeId ?? undefined,
        isClientVisible: !!task.isClientVisible,
      });
    }
  }, [task, editForm.reset]);

  function onSaveEdit(values: EditForm) {
    if (!task) return;
    updateTask.mutate({ id: task.id, ...values, version: task.version });
  }

  function onDelete() {
    if (!task) return;
    if (!confirm(`Delete "${task.title}"? This can be recovered from the audit trail.`)) return;
    deleteTask.mutate(
      { id: task.id, version: task.version },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  function onSubmitComment(values: CommentForm) {
    addComment.mutate(
      { body: values.body, isInternal: isPm ? commentIsInternal : true },
      { onSuccess: () => commentForm.reset() },
    );
  }

  function onSubmitAttachment(values: AttachmentForm) {
    addAttachment.mutate(values, { onSuccess: () => attachmentForm.reset() });
  }

  // This dialog only opens from the PM/Internal board, which always gets the full
  // Project shape (with members) rather than the Client Guest's ClientProjectSummary.
  const members = (project as Project | undefined)?.members ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {isLoading || !task ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle>{task.title}</DialogTitle>
                {task.department && (
                  <Badge
                    className={cn(
                      'h-auto px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                      DEPARTMENT_STYLES[task.department].badge,
                    )}
                  >
                    {DEPARTMENT_STYLES[task.department].label}
                  </Badge>
                )}
                <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList className="w-full">
                <TabsTrigger value="details" className={TAB_TRIGGER}>
                  Details
                </TabsTrigger>
                <TabsTrigger value="comments" className={TAB_TRIGGER}>
                  Comments
                  <TabCount value={task.comments.length} />
                </TabsTrigger>
                <TabsTrigger value="attachments" className={TAB_TRIGGER}>
                  <span className="sm:hidden">Files</span>
                  <span className="hidden sm:inline">Attachments</span>
                  <TabCount value={task.attachments.length} />
                </TabsTrigger>
                <TabsTrigger value="history" className={TAB_TRIGGER}>
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {isPm ? (
                  <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input id="edit-title" {...editForm.register('title')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        rows={4}
                        {...editForm.register('description')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Controller
                        control={editForm.control}
                        name="assigneeId"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ''}
                            onValueChange={(value) => {
                              // Radix emits '' while its items are still mounting; treating that
                              // as a real choice would silently unassign the task on save.
                              if (value) field.onChange(value);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              {members
                                .filter((m) => m.user.department === task.department)
                                .map((m) => (
                                  <SelectItem key={m.userId} value={m.userId}>
                                    {m.user.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Controller
                        control={editForm.control}
                        name="isClientVisible"
                        render={({ field }) => (
                          <Checkbox
                            id="edit-client-visible"
                            checked={field.value}
                            onCheckedChange={(v) => field.onChange(!!v)}
                          />
                        )}
                      />
                      <Label htmlFor="edit-client-visible" className="font-normal">
                        Visible to the Client Guest
                      </Label>
                    </div>
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={onDelete}
                        disabled={deleteTask.isPending}
                      >
                        <Trash2 className="size-4" />
                        Delete task
                      </Button>
                      <Button type="submit" disabled={updateTask.isPending}>
                        {updateTask.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {task.description || 'No description.'}
                  </p>
                )}

                {task.isBlocked && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Blocked by: {task.blockedBy.map((b) => b.title).join(', ')}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                <div className="space-y-3">
                  {task.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                  {task.comments.map((c) => (
                    <div key={c.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="font-medium">{c.author?.name ?? 'Unknown'}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {c.isInternal === false && (
                            <Badge variant="outline">Client-visible</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-muted-foreground">{c.body}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={commentForm.handleSubmit(onSubmitComment)} className="space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Add a comment…"
                    {...commentForm.register('body')}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {isPm && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          id="comment-share-client"
                          checked={!commentIsInternal}
                          onCheckedChange={(v) => setCommentIsInternal(!v)}
                        />
                        <Label htmlFor="comment-share-client" className="font-normal">
                          Share with Client Guest
                        </Label>
                      </div>
                    )}
                    <Button type="submit" disabled={addComment.isPending} className="sm:ml-auto">
                      {addComment.isPending ? 'Posting…' : 'Post comment'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4">
                <div className="space-y-2">
                  {task.attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No attachments yet.</p>
                  )}
                  {task.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={isSafeUrl(a.fileUrl) ? a.fileUrl : undefined}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted"
                    >
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{a.fileName}</span>
                    </a>
                  ))}
                </div>

                <form
                  onSubmit={attachmentForm.handleSubmit(onSubmitAttachment)}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input placeholder="File name" {...attachmentForm.register('fileName')} />
                    <Input placeholder="https://…" {...attachmentForm.register('fileUrl')} />
                  </div>
                  {(attachmentForm.formState.errors.fileName ||
                    attachmentForm.formState.errors.fileUrl) && (
                    <p className="text-xs text-destructive">Provide a file name and a valid URL.</p>
                  )}
                  <Button
                    type="submit"
                    disabled={addAttachment.isPending}
                    className="w-full sm:w-auto"
                  >
                    {addAttachment.isPending ? 'Attaching…' : 'Attach link'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="history" className="space-y-2">
                {(auditLogs?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No history yet.</p>
                )}
                {auditLogs?.map((log) => (
                  <div key={log.id} className={cn('rounded-md border p-2 text-xs')}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 text-muted-foreground">
                      <span className="font-medium text-foreground">{log.user.name}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-0.5">
                      {log.action === 'CREATE' && 'Created the task'}
                      {log.action === 'DELETE' && 'Deleted the task'}
                      {(log.action === 'UPDATE' || log.action === 'STATUS_CHANGE') &&
                        log.changedColumn && (
                          <>
                            Changed <span className="font-medium">{log.changedColumn}</span>:{' '}
                            {log.oldValue ?? '—'} → {log.newValue ?? '—'}
                          </>
                        )}
                    </p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
