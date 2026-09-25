import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { User } from '@/types';
import type { InternalTask } from './task-card';
import { TaskCard } from './task-card';

function makeTask(overrides: Partial<InternalTask> = {}): InternalTask {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Sample task',
    description: null,
    status: 'TODO',
    department: 'FRONTEND',
    assigneeId: null,
    assignee: null,
    isClientVisible: false,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBlocked: false,
    blockedBy: [],
    attachments: [],
    comments: [],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@nodewave.id',
    name: 'Test User',
    role: 'PM',
    department: null,
    avatarUrl: null,
    ...overrides,
  };
}

describe('TaskCard', () => {
  test('lets the assignee start an unblocked task in their own department', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const currentUser = makeUser({ id: 'fe-1', role: 'INTERNAL', department: 'FRONTEND' });
    const task = makeTask({ status: 'TODO', assigneeId: 'fe-1', department: 'FRONTEND' });

    render(
      <TaskCard
        task={task}
        currentUser={currentUser}
        onStatusChange={onStatusChange}
        onOpenDetail={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onStatusChange).toHaveBeenCalledWith('IN_PROGRESS');
  });

  test('disables Start and shows the reason when the task is blocked by a dependency', () => {
    const currentUser = makeUser({ id: 'fe-1', role: 'INTERNAL', department: 'FRONTEND' });
    const task = makeTask({
      status: 'TODO',
      assigneeId: 'fe-1',
      department: 'FRONTEND',
      isBlocked: true,
      blockedBy: [{ id: 'dep-1', title: 'Backend API Integration', status: 'IN_PROGRESS' }],
    });

    render(
      <TaskCard
        task={task}
        currentUser={currentUser}
        onStatusChange={() => {}}
        onOpenDetail={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('Backend API Integration'));
    expect(screen.getByText(/Blocked by Backend API Integration/)).toBeInTheDocument();
  });

  test('disables the action for an Internal Team member outside the task department', () => {
    const currentUser = makeUser({ id: 'be-1', role: 'INTERNAL', department: 'BACKEND' });
    const task = makeTask({ status: 'TODO', department: 'FRONTEND' });

    render(
      <TaskCard
        task={task}
        currentUser={currentUser}
        onStatusChange={() => {}}
        onOpenDetail={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('FRONTEND'));
  });

  test('never lets a PM move a task from In Progress to Done, even when unblocked', () => {
    const pm = makeUser({ role: 'PM' });
    const task = makeTask({ status: 'IN_PROGRESS', isBlocked: false });

    render(
      <TaskCard task={task} currentUser={pm} onStatusChange={() => {}} onOpenDetail={() => {}} />,
    );

    const button = screen.getByRole('button', { name: 'Complete' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('assigned executor'));
  });

  test('renders no Start/Complete action once a task is Done', () => {
    const pm = makeUser({ role: 'PM' });
    const task = makeTask({ status: 'DONE' });

    render(
      <TaskCard task={task} currentUser={pm} onStatusChange={() => {}} onOpenDetail={() => {}} />,
    );

    // The card itself is role="button" (click-to-open-detail) — only the Start/Complete
    // action button, if any, should be absent here.
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
  });

  test('opens the detail dialog when the card body is clicked, not when the action button is', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const onStatusChange = vi.fn();
    const currentUser = makeUser({ id: 'fe-1', role: 'INTERNAL', department: 'FRONTEND' });
    const task = makeTask({ status: 'TODO', assigneeId: 'fe-1', department: 'FRONTEND' });

    render(
      <TaskCard
        task={task}
        currentUser={currentUser}
        onStatusChange={onStatusChange}
        onOpenDetail={onOpenDetail}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onOpenDetail).not.toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Sample task'));
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  test('Enter and Space on the action button only run the action, not also open the detail', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const onStatusChange = vi.fn();
    const currentUser = makeUser({ id: 'fe-1', role: 'INTERNAL', department: 'FRONTEND' });
    const task = makeTask({ status: 'TODO', assigneeId: 'fe-1', department: 'FRONTEND' });

    render(
      <TaskCard
        task={task}
        currentUser={currentUser}
        onStatusChange={onStatusChange}
        onOpenDetail={onOpenDetail}
      />,
    );

    screen.getByRole('button', { name: 'Start' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onStatusChange).toHaveBeenCalledTimes(2);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  test('Enter and Space on the card itself open the detail', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <TaskCard
        task={makeTask()}
        currentUser={makeUser({ role: 'PM' })}
        onStatusChange={onStatusChange}
        onOpenDetail={onOpenDetail}
      />,
    );

    screen.getByTestId('task-card').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onOpenDetail).toHaveBeenCalledTimes(2);
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
