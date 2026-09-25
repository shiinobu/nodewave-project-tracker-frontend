'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/hooks/use-projects';
import { useCreateTask, useTasks } from '@/hooks/use-tasks';
import type { Project } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  department: z.enum(['UIUX', 'FRONTEND', 'BACKEND']),
  assigneeId: z.string().optional(),
  isClientVisible: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function CreateTaskDialog({
  projectId,
  triggerClassName,
}: {
  projectId: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const { data: project } = useProject(open ? projectId : undefined);
  const { data: tasksData } = useTasks({ projectId: open ? projectId : undefined, rows: 100 });
  const createTask = useCreateTask();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { department: 'FRONTEND', isClientVisible: false },
  });

  const selectedDepartment = watch('department');
  const members = (project as Project | undefined)?.members ?? [];
  const assigneeOptions = members.filter(
    (m) => m.user.role === 'INTERNAL' && m.user.department === selectedDepartment,
  );

  function toggleDependency(id: string) {
    setDependsOn((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id],
    );
  }

  function onSubmit(values: FormValues) {
    createTask.mutate(
      {
        projectId,
        title: values.title,
        description: values.description,
        department: values.department,
        assigneeId: values.assigneeId,
        isClientVisible: values.isClientVisible,
        dependsOnTaskIds: dependsOn,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
          setDependsOn([]);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <Plus className="size-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Assign a department and, if needed, mark which tasks must finish first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" rows={3} {...register('description')} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // The picker only offers members of the chosen department, so a
                        // previous pick no longer belongs to this task.
                        setValue('assigneeId', undefined);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UIUX">UI/UX</SelectItem>
                        <SelectItem value="FRONTEND">Frontend</SelectItem>
                        <SelectItem value="BACKEND">Backend</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Controller
                  control={control}
                  name="assigneeId"
                  render={({ field }) => (
                    // Keyed by department so a department change remounts the picker: Radix
                    // keeps its last selection when `value` turns undefined, which would leave
                    // an empty box instead of the "Unassigned" placeholder.
                    <Select
                      key={selectedDepartment}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeOptions.length === 0 && (
                          <div className="p-2 text-xs text-muted-foreground">
                            No {selectedDepartment} members on this project
                          </div>
                        )}
                        {assigneeOptions.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="isClientVisible"
                render={({ field }) => (
                  <Checkbox
                    id="task-client-visible"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                  />
                )}
              />
              <Label htmlFor="task-client-visible" className="font-normal">
                Visible to the Client Guest
              </Label>
            </div>

            {(tasksData?.entries.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>Depends on</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {tasksData?.entries.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={dependsOn.includes(t.id)}
                        onChange={() => toggleDependency(t.id)}
                      />
                      {t.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
