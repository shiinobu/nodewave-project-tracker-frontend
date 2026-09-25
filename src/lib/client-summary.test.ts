import { describe, expect, test } from 'vitest';
import type { Task } from '@/types';
import { type ActivityEvent, buildActivity, groupByDay, progressSummary } from './client-summary';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't',
    projectId: 'p',
    title: 'Task',
    description: null,
    status: 'TODO',
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

describe('progressSummary', () => {
  test('describes a mixed project in one sentence', () => {
    expect(progressSummary({ done: 3, inProgress: 2, next: 1 })).toBe(
      'Of the 6 tasks shared with you, three are complete, two are in progress and one is up next.',
    );
  });

  test('joins exactly two states with "and" and handles singulars', () => {
    expect(progressSummary({ done: 1, inProgress: 1, next: 0 })).toBe(
      'Of the 2 tasks shared with you, one is complete and one is in progress.',
    );
  });

  test('collapses a single state into an "all" sentence', () => {
    expect(progressSummary({ done: 3, inProgress: 0, next: 0 })).toBe(
      'All 3 tasks shared with you are complete.',
    );
    expect(progressSummary({ done: 0, inProgress: 1, next: 0 })).toBe(
      'Your shared task is in progress.',
    );
  });

  test('says so when nothing has been shared', () => {
    expect(progressSummary({ done: 0, inProgress: 0, next: 0 })).toBe(
      'No tasks have been shared with you yet.',
    );
  });

  test('falls back to digits above ten', () => {
    expect(progressSummary({ done: 12, inProgress: 1, next: 0 })).toBe(
      'Of the 13 tasks shared with you, 12 are complete and one is in progress.',
    );
  });
});

describe('buildActivity', () => {
  const tasks = [
    makeTask({
      id: 'a',
      title: 'UI Design',
      status: 'DONE',
      updatedAt: '2026-01-03T10:00:00.000Z',
      comments: [{ id: 'c1', body: 'Design approved.', createdAt: '2026-01-03T09:00:00.000Z' }],
    }),
    makeTask({
      id: 'b',
      title: 'Backend API',
      status: 'IN_PROGRESS',
      updatedAt: '2026-01-04T08:00:00.000Z',
      attachments: [
        {
          id: 'f1',
          fileName: 'spec.pdf',
          fileUrl: 'https://x.test/spec.pdf',
          createdAt: '2026-01-02T12:00:00.000Z',
        },
      ],
    }),
    makeTask({ id: 'c', title: 'Frontend', status: 'TODO', createdAt: '2026-01-01T00:00:00.000Z' }),
  ];

  test('lists task states, notes and files newest first', () => {
    expect(buildActivity(tasks).map((e) => `${e.kind}:${e.task}`)).toEqual([
      'progress:Backend API',
      'done:UI Design',
      'note:UI Design',
      'file:Backend API',
      'planned:Frontend',
    ]);
  });

  test('never carries an actor, only what a client can already see', () => {
    for (const event of buildActivity(tasks)) {
      expect(Object.keys(event).sort()).toEqual(
        event.detail ? ['at', 'detail', 'id', 'kind', 'task'] : ['at', 'id', 'kind', 'task'],
      );
    }
  });

  test('respects the limit', () => {
    expect(buildActivity(tasks, 2)).toHaveLength(2);
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 8, 23, 12, 0);
  const event = (id: string, at: Date): ActivityEvent => ({
    id,
    at: at.toISOString(),
    kind: 'done',
    task: id,
  });

  test('groups newest-first events by calendar day and flags today', () => {
    const days = groupByDay(
      [
        event('a', new Date(2026, 8, 23, 10)),
        event('b', new Date(2026, 8, 23, 8)),
        event('c', new Date(2026, 8, 22, 17)),
        event('d', new Date(2026, 8, 19, 9)),
      ],
      now,
    );

    expect(days.map((day) => `${day.label}:${day.events.map((e) => e.id).join('')}`)).toEqual([
      'Today:ab',
      'Yesterday:c',
      'Sat, Sep 19:d',
    ]);
    expect(days.map((day) => day.isToday)).toEqual([true, false, false]);
  });

  test('returns nothing for no events', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
