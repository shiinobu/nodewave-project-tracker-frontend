'use client';

import { ClientProjectView } from '@/components/dashboard/client-project-view';
import { TaskBoard } from '@/components/dashboard/task-board';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return user.role === 'CLIENT' ? <ClientProjectView /> : <TaskBoard currentUser={user} />;
}
