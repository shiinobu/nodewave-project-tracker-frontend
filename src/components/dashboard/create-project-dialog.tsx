'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject } from '@/hooks/use-projects';
import { useUsers } from '@/hooks/use-users';

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateProjectDialog({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const { data: usersData } = useUsers(open);
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function toggleMember(id: string) {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    );
  }

  function onSubmit(values: FormValues) {
    createProject.mutate(
      { ...values, memberUserIds: memberIds },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
          setMemberIds([]);
        },
      },
    );
  }

  const members = usersData?.entries.filter((u) => u.role !== 'PM') ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <Plus className="size-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Add the Internal Team and Client Guest members who should have access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea id="project-description" rows={3} {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {members.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">No users to add yet.</p>
                )}
                {members.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={memberIds.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                    />
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role === 'CLIENT' ? 'Client Guest' : user.department}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
