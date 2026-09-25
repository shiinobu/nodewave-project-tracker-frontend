'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Settings2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddProjectMember,
  useProject,
  useRemoveProjectMember,
  useUpdateProject,
} from '@/hooks/use-projects';
import { useUsers } from '@/hooks/use-users';
import { DEPARTMENT_STYLES } from '@/lib/department-styles';
import { cn } from '@/lib/utils';
import type { Project, ProjectMember } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function memberLabel(user: ProjectMember['user']) {
  if (user.role === 'CLIENT') return 'Client Guest';
  return user.department ? DEPARTMENT_STYLES[user.department].label : 'Internal Team';
}

/**
 * Mounted only once the project has loaded, so the fields start from the real values. Resetting a
 * form that was mounted empty misses the fields under the React Compiler, so it is keyed by the
 * saved values instead and remounts with the new ones after a save.
 */
function ProjectForm({
  project,
  saving,
  onSave,
}: {
  project: Project;
  saving: boolean;
  onSave: (input: { name: string; description: string }) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: project.name, description: project.description ?? '' },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSave({ name: values.name, description: values.description ?? '' }),
      )}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="manage-project-name">Name</Label>
        <Input id="manage-project-name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="manage-project-description">Description</Label>
        <Textarea id="manage-project-description" rows={3} {...register('description')} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

/** PM-only: rename the project and decide who can see it. */
export function ManageProjectDialog({
  projectId,
  triggerClassName,
}: {
  projectId: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const { data: project } = useProject(open ? projectId : undefined);
  const { data: usersData } = useUsers(open);
  const updateProject = useUpdateProject(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  // A PM always gets the full project (with members), never the Client Guest summary.
  const details = project as Project | undefined;
  const members = details?.members ?? [];
  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = (usersData?.entries ?? []).filter(
    (user) => user.role !== 'PM' && !memberIds.has(user.id),
  );

  function onAdd() {
    if (!selectedUserId) return;
    addMember.mutate(selectedUserId, { onSuccess: () => setSelectedUserId(undefined) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <Settings2 className="size-4" />
          Manage project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage project</DialogTitle>
          <DialogDescription>Rename the project and choose who can see it.</DialogDescription>
        </DialogHeader>

        {details ? (
          <ProjectForm
            key={`${details.name}|${details.description ?? ''}`}
            project={details}
            saving={updateProject.isPending}
            onSave={(input) => updateProject.mutate(input)}
          />
        ) : (
          <Skeleton className="h-44 w-full" />
        )}

        <Separator />

        <section aria-labelledby="manage-project-members" className="space-y-3">
          <h3 id="manage-project-members" className="text-sm font-semibold">
            Members
          </h3>

          {!details ? (
            <Skeleton className="h-16 w-full" />
          ) : members.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No members yet. Internal Team and Client Guest accounts only see a project once you
              add them.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{member.user.name}</span>
                    <Badge
                      className={cn(
                        'h-auto shrink-0 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                        member.user.department
                          ? DEPARTMENT_STYLES[member.user.department].badge
                          : 'border-transparent bg-secondary text-secondary-foreground',
                      )}
                    >
                      {memberLabel(member.user)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${member.user.name} from the project`}
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(member.userId)}
                  >
                    <UserMinus className="size-4" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            {/* Keyed by the member count: Radix keeps its last selection when `value` turns
                undefined, which would leave an empty trigger after a member was added. */}
            <Select key={members.length} value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="min-w-0 flex-1" aria-label="Member to add">
                <SelectValue
                  placeholder={candidates.length > 0 ? 'Add a member' : 'Everyone is a member'}
                />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} · {memberLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={onAdd} disabled={!selectedUserId || addMember.isPending}>
              Add
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
