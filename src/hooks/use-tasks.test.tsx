import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as tasksApi from '@/lib/api/tasks';
import { useAuditLogs, useDeleteTask, useTask, useTasks, useUpdateTask } from './use-tasks';

vi.mock('@/lib/api/tasks');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const api = vi.mocked(tasksApi);

function conflict() {
  return new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: { error: 'This task was changed by someone else. Refresh and try again.' },
  } as AxiosResponse);
}

/** Mounts the three reads the task board and the detail dialog keep open at the same time. */
function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const view = renderHook(
    () => ({
      list: useTasks({ projectId: 'project-1', rows: 100 }),
      detail: useTask('task-1'),
      history: useAuditLogs('task-1'),
      update: useUpdateTask(),
      remove: useDeleteTask(),
    }),
    { wrapper },
  );
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listTasks.mockResolvedValue({ entries: [], totalData: 0, totalPage: 1 });
  api.getTask.mockResolvedValue({ id: 'task-1', version: 1 } as never);
  api.listAuditLogs.mockResolvedValue([] as never);
  api.updateTask.mockResolvedValue({ id: 'task-1', version: 2 } as never);
  api.deleteTask.mockResolvedValue(undefined as never);
});

describe('task cache after a mutation', () => {
  test('a successful save refetches the board, the open task and its history', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.history.isSuccess).toBe(true));
    expect(api.getTask).toHaveBeenCalledTimes(1);
    expect(api.listAuditLogs).toHaveBeenCalledTimes(1);

    await act(() => result.current.update.mutateAsync({ id: 'task-1', title: 'New', version: 1 }));

    // Without this the dialog keeps the old `version`, so the next save is a 409 against
    // the user's own change, and the History tab misses the row that was just written.
    await waitFor(() => expect(api.getTask).toHaveBeenCalledTimes(2));
    expect(api.listTasks).toHaveBeenCalledTimes(2);
    expect(api.listAuditLogs).toHaveBeenCalledTimes(2);
  });

  test('a 409 conflict refetches the open task so the next attempt uses its current version', async () => {
    api.updateTask.mockRejectedValue(conflict());
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    await act(async () => {
      await result.current.update
        .mutateAsync({ id: 'task-1', title: 'New', version: 1 })
        .catch(() => undefined);
    });

    await waitFor(() => expect(api.getTask).toHaveBeenCalledTimes(2));
    expect(api.listTasks).toHaveBeenCalledTimes(2);
  });

  test('a 409 on delete resyncs too', async () => {
    api.deleteTask.mockRejectedValue(conflict());
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    await act(async () => {
      await result.current.remove.mutateAsync({ id: 'task-1', version: 1 }).catch(() => undefined);
    });

    await waitFor(() => expect(api.getTask).toHaveBeenCalledTimes(2));
  });

  test('an error that is not a conflict does not trigger a refetch', async () => {
    api.updateTask.mockRejectedValue(new Error('network down'));
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    await act(async () => {
      await result.current.update
        .mutateAsync({ id: 'task-1', title: 'New', version: 1 })
        .catch(() => undefined);
    });

    expect(api.getTask).toHaveBeenCalledTimes(1);
  });
});
