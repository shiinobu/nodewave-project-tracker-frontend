'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand-mark';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logout as logoutRequest } from '@/lib/api/auth';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const ROLE_LABEL: Record<string, string> = {
  PM: 'Product Manager',
  INTERNAL: 'Internal Team',
  CLIENT: 'Client Guest',
};

export function Topbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clear();
      // Drop every cached query so the next login never renders a stale, wrong-role
      // response (e.g. an empty project list left over from a different account).
      queryClient.clear();
      router.replace('/login');
    }
  }

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b bg-card px-6 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <BrandMark />
        <div className="flex flex-col leading-tight">
          <span className="font-heading text-[17px] font-bold tracking-tight">NodeWave</span>
          <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground max-[369px]:hidden">
            Project Tracker
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[13px] font-semibold">{user.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {ROLE_LABEL[user.role]}
            {user.department ? ` · ${user.department}` : ''}
          </p>
        </div>
        <Badge className="h-auto border-transparent bg-accent px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-primary">
          {user.role}
        </Badge>
        <Avatar className="size-8.5 max-[339px]:hidden" title={user.name}>
          <AvatarFallback className="bg-accent font-heading text-xs font-bold text-primary">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="max-sm:size-10 max-sm:px-0"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  );
}
