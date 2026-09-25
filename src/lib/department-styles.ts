import type { Department } from '@/types';

// Tailwind's scanner only picks up literal class strings, so every variant is spelled
// out in full here rather than built at runtime (e.g. via string concatenation).
export const DEPARTMENT_STYLES: Record<
  Department,
  { label: string; badge: string; bar: string; avatar: string; dot: string }
> = {
  UIUX: {
    label: 'UI/UX',
    badge: 'border-transparent bg-dept-uiux-soft text-dept-uiux',
    bar: 'bg-dept-uiux',
    avatar: 'bg-dept-uiux-soft text-dept-uiux',
    dot: 'bg-dept-uiux',
  },
  FRONTEND: {
    label: 'Frontend',
    badge: 'border-transparent bg-dept-frontend-soft text-dept-frontend',
    bar: 'bg-dept-frontend',
    avatar: 'bg-dept-frontend-soft text-dept-frontend',
    dot: 'bg-dept-frontend',
  },
  BACKEND: {
    label: 'Backend',
    badge: 'border-transparent bg-dept-backend-soft text-dept-backend',
    bar: 'bg-dept-backend',
    avatar: 'bg-dept-backend-soft text-dept-backend',
    dot: 'bg-dept-backend',
  },
};
