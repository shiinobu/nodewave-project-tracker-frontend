import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as projectsApi from '@/lib/api/projects';
import * as usersApi from '@/lib/api/users';
import type { Department, ProjectMember, Role, User } from '@/types';
import { ManageProjectDialog } from './manage-project-dialog';

vi.mock('@/lib/api/projects');
vi.mock('@/lib/api/users');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const projects = vi.mocked(projectsApi);
const users = vi.mocked(usersApi);

function account(id: string, name: string, role: Role, department: Department | null): User {
  return { id, email: `${id}@nodewave.id`, name, role, department, avatarUrl: null };
}

const uma = account('u1', 'Uma UIUX', 'INTERNAL', 'UIUX');
const citra = account('u2', 'Citra Client', 'CLIENT', null);
const budi = account('u3', 'Budi Backend', 'INTERNAL', 'BACKEND');
const nadia = account('u4', 'Nadia PM', 'PM', null);

const membership = (user: User): ProjectMember => ({
  id: `member-${user.id}`,
  userId: user.id,
  user: { id: user.id, name: user.name, role: user.role, department: user.department },
});

const project = {
  id: 'p1',
  name: 'Portal Revamp',
  description: 'Rebuild the portal',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [membership(uma), membership(citra)],
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ManageProjectDialog projectId="p1" />
    </QueryClientProvider>,
  );
}

async function openDialog() {
  const user = userEvent.setup();
  renderDialog();
  await user.click(screen.getByRole('button', { name: /manage project/i }));
  await screen.findByText('Citra Client');
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  projects.getProject.mockResolvedValue(project as never);
  projects.updateProject.mockResolvedValue(project as never);
  projects.removeProjectMember.mockResolvedValue(undefined as never);
  projects.addProjectMember.mockResolvedValue(membership(budi) as never);
  users.listUsers.mockResolvedValue({
    entries: [uma, citra, budi, nadia],
    totalData: 4,
    totalPage: 1,
  });
});

describe('ManageProjectDialog', () => {
  test('opens with the current name and description and lists the members', async () => {
    await openDialog();

    expect(await screen.findByDisplayValue('Portal Revamp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rebuild the portal')).toBeInTheDocument();
    expect(screen.getByText('Uma UIUX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  test('saving sends the edited name together with the description', async () => {
    const user = await openDialog();
    const name = await screen.findByDisplayValue('Portal Revamp');

    await user.clear(name);
    await user.type(name, 'Portal v2');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(projects.updateProject).toHaveBeenCalledWith('p1', {
      name: 'Portal v2',
      description: 'Rebuild the portal',
    });
  });

  test('a project cannot be saved without a name', async () => {
    const user = await openDialog();
    await user.clear(await screen.findByDisplayValue('Portal Revamp'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Project name is required')).toBeInTheDocument();
    expect(projects.updateProject).not.toHaveBeenCalled();
  });

  test('Remove asks the API to remove that member', async () => {
    const user = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Remove Uma UIUX from the project' }));

    expect(projects.removeProjectMember).toHaveBeenCalledWith('p1', 'u1');
  });
});
