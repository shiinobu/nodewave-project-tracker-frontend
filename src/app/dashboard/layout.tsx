'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Topbar } from '@/components/dashboard/topbar';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, token, router]);

  if (!hasHydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 px-6 py-6 sm:px-8">{children}</main>
    </div>
  );
}
