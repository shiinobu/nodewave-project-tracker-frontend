'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const HIGHLIGHTS = [
  'State-based permissions per role and department',
  'Dependency-aware task board with automatic blocking',
  'Optimistic locking and an immutable audit trail',
];

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    try {
      const { token, user } = await login(values);
      // A previous session's cached queries (or none at all) may still be sitting in the
      // client — never let them leak into this one, especially across different roles.
      queryClient.clear();
      setSession(token, user);
      router.replace('/dashboard');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r bg-card p-10 lg:flex">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-72 w-full text-primary/20"
          viewBox="0 0 800 280"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 150c100-80 200-80 300 0s200 80 300 0 150-50 200-10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 200c100-80 200-80 300 0s200 80 300 0 150-50 200-10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 250c100-80 200-80 300 0s200 80 300 0 150-50 200-10"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <span className="font-heading text-lg font-bold tracking-tight">NodeWave</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            The operational backbone for your highest-value projects.
          </h1>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Product · UI/UX · Frontend · Backend · Client
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your seeded account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="pm@nodewave.id"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground lg:text-left">
            Seeded accounts: pm / uiux / frontend / backend / client @nodewave.id · password123
          </p>
          <p className="text-center text-sm text-muted-foreground lg:text-left">
            New here?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
