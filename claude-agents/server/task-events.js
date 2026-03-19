/**
 * Append-only lifecycle event log for tasks.
 *
 * Phases (non-exhaustive):
 *   task_created, task_queued, task_started, claude_pid_assigned,
 *   claude_exited, verification, merge_started, merge_completed,
 *   merge_failed, completed, failed, archived, retry
 */

import { addTaskEvent, getTaskEvents } from './db.js';

/**
 * Persist a lifecycle event and log it to stdout.
 *
 * @param {string} taskId
 * @param {string} phase
 * @param {string|null} detail
 */
export function logEvent(taskId, phase, detail = null) {
  addTaskEvent(taskId, phase, detail);

  const ts = new Date().toISOString();
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`[${ts}] task=${taskId} phase=${phase}${suffix}`);
}

/**
 * Return the full ordered timeline of events for a task.
 *
 * @param {string} taskId
 * @returns {Array<{id: number, taskId: string, phase: string, detail: string|null, timestamp: string}>}
 */
export function getTaskTimeline(taskId) {
  return getTaskEvents(taskId);
}
