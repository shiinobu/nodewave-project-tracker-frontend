import type { Task } from '@/types';
import { dayLabel } from './time';

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

const spell = (n: number) => WORDS[n] ?? String(n);

/** e.g. "Of the 6 tasks shared with you, three are complete, two are in progress and one is up next." */
export function progressSummary(counts: { done: number; inProgress: number; next: number }) {
  const parts = [
    { n: counts.done, label: 'complete' },
    { n: counts.inProgress, label: 'in progress' },
    { n: counts.next, label: 'up next' },
  ].filter((part) => part.n > 0);

  const total = parts.reduce((sum, part) => sum + part.n, 0);
  const [only] = parts;
  if (!only) return 'No tasks have been shared with you yet.';

  if (parts.length === 1) {
    return total === 1
      ? `Your shared task is ${only.label}.`
      : `All ${total} tasks shared with you are ${only.label}.`;
  }

  const phrases = parts.map(
    (part) => `${spell(part.n)} ${part.n === 1 ? 'is' : 'are'} ${part.label}`,
  );
  const last = phrases[phrases.length - 1];
  const head = phrases.slice(0, -1).join(', ');
  return `Of the ${total} tasks shared with you, ${head} and ${last}.`;
}

export type ActivityKind = 'done' | 'progress' | 'planned' | 'note' | 'file';

export interface ActivityEvent {
  id: string;
  at: string;
  kind: ActivityKind;
  task: string;
  detail?: string;
}

/**
 * Anonymous activity built only from what a Client Guest can already see: task states,
 * shared notes and attachments. No event carries an actor, by design.
 */
export function buildActivity(tasks: Task[], limit = 20): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') {
      events.push({ id: `${task.id}:done`, at: task.updatedAt, kind: 'done', task: task.title });
    } else if (task.status === 'IN_PROGRESS') {
      events.push({
        id: `${task.id}:progress`,
        at: task.updatedAt,
        kind: 'progress',
        task: task.title,
      });
    } else {
      events.push({
        id: `${task.id}:planned`,
        at: task.createdAt,
        kind: 'planned',
        task: task.title,
      });
    }

    for (const note of task.comments) {
      events.push({
        id: `note:${note.id}`,
        at: note.createdAt,
        kind: 'note',
        task: task.title,
        detail: note.body,
      });
    }
    for (const file of task.attachments) {
      events.push({
        id: `file:${file.id}`,
        at: file.createdAt,
        kind: 'file',
        task: task.title,
        detail: file.fileName,
      });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export interface ActivityDay {
  key: string;
  label: string;
  isToday: boolean;
  events: ActivityEvent[];
}

/** Groups newest-first events by local calendar day, e.g. "Today", "Yesterday", "Mon, Sep 21". */
export function groupByDay(events: ActivityEvent[], now = new Date()): ActivityDay[] {
  const days: ActivityDay[] = [];

  for (const event of events) {
    const key = new Date(event.at).toDateString();
    const current = days[days.length - 1];
    if (current && current.key === key) {
      current.events.push(event);
      continue;
    }
    const label = dayLabel(event.at, now);
    days.push({ key, label, isToday: label === 'Today', events: [event] });
  }

  return days;
}
