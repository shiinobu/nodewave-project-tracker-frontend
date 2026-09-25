'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { register as registerRequest } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    // No PM here: the API refuses PM sign-up without an invite code, so it is not offered.
    role: z.enum(['INTERNAL', 'CLIENT']),
    department: z.enum(['UIUX', 'FRONTEND', 'BACKEND']).optional(),
  })
  .refine((data) => data.role !== 'INTERNAL' || !!data.department, {
    message: 'Pick a department for Internal Team members',
    path: ['department'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'INTERNAL' },
  });

  const role = watch('role');

  async function onSubmit(values: RegisterForm) {
    try {
      const { token, user } = await registerRequest(values);
      queryClient.clear();
      setSession(token, user);
      router.replace('/dashboard');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-3 text-center">
          <BrandMark />
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Join a NodeWave project workspace.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal Team</SelectItem>
                    <SelectItem value="CLIENT">Client Guest</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Product Manager accounts are provisioned by NodeWave.
            </p>
          </div>

          {role === 'INTERNAL' && (
            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                control={control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UIUX">UI/UX</SelectItem>
                      <SelectItem value="FRONTEND">Frontend</SelectItem>
                      <SelectItem value="BACKEND">Backend</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.department && (
                <p className="text-sm text-destructive">{errors.department.message}</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
