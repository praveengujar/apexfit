/**
 * Self-healing recovery engine.
 *
 * Runs a scan every 30 seconds, detecting and repairing 6 failure patterns:
 *   0a  Zombie Retry       - running task with no session, stale > 3 min
 *   0b  Stuck Merge        - mergeFailed=1 but status not done/failed
 *   0c  Write-Race Victim  - done + merged=0 but branch actually merged in git
 *   1   Ghost Runner       - running task whose PID is no longer alive
 *   2-3 Binary Missing / Hook Blocked - ENOENT or hook-denied errors (no retry)
 *   4-5 Stale Session / Rate Limit    - conversation-not-found or 529 (auto-retry)
 */

import { execFileSync } from 'node:child_process';
import { getAllTasks, updateTask, getRunningTasks } from './db.js';
import { logEvent } from './task-events.js';

const SCAN_INTERVAL_MS = 30_000;
const ZOMBIE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const RETRY_BACKOFF_MS = 60_000;
const MAX_RETRIES_DEFAULT = 3;

// Project directory for git commands — set via setProjectDir() at startup.
let _projectDir = process.cwd();

/** Set the project directory used as cwd for all git commands. */
export function setProjectDir(dir) {
  _projectDir = dir;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the given PID is still alive. */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Check whether a git branch has merge evidence in the log. */
function branchMergedInGit(branchName) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--all', '--oneline', '--merges', `--grep=${branchName}`],
      { cwd: _projectDir, encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    if (out.trim().length > 0) return true;
  } catch {
    // git log failed — fall through to next check
  }

  try {
    // Fallback: check if the branch ref is an ancestor of HEAD
    execFileSync('git', ['merge-base', '--is-ancestor', branchName, 'HEAD'], {
      cwd: _projectDir,
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/** Check if a branch exists locally or remotely. */
function branchExistsInGit(branchName) {
  try {
    const out = execFileSync(
      'git',
      ['branch', '-a', '--list', `*${branchName}*`],
      { cwd: _projectDir, encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Recovery rules
// ---------------------------------------------------------------------------

function rule0aZombieRetry(task) {
  if (task.status !== 'running') return false;
  if (task.sessionId) return false;

  const startedAt = task.startedAt ? new Date(task.startedAt).getTime() : 0;
  if (Date.now() - startedAt < ZOMBIE_THRESHOLD_MS) return false;

  updateTask(task.id, {
    status: 'failed',
    error: 'Zombie retry: running with no session for >3 min',
    finishedAt: new Date().toISOString(),
  });
  logEvent(task.id, 'failed', 'Rule 0a: zombie retry detected — escalation');
  return true;
}

function rule0bStuckMerge(task) {
  if (!task.mergeFailed) return false;
  if (task.status === 'done' || task.status === 'failed') return false;

  const branch = task.branch || task.branchName || '';
  if (branch && branchExistsInGit(branch) && branchMergedInGit(branch)) {
    updateTask(task.id, {
      status: 'done',
      merged: 1,
      mergeFailed: 0,
      finishedAt: new Date().toISOString(),
    });
    logEvent(task.id, 'completed', 'Rule 0b: merge evidence found in git — marked done+merged');
    return true;
  }

  updateTask(task.id, {
    status: 'failed',
    error: 'Stuck merge: mergeFailed with no git evidence of success',
    finishedAt: new Date().toISOString(),
  });
  logEvent(task.id, 'failed', 'Rule 0b: stuck merge with no git merge evidence');
  return true;
}

function rule0cWriteRaceVictim(task) {
  if (task.status !== 'done') return false;
  if (task.merged) return false;

  const branch = task.branch || task.branchName || '';
  if (!branch) return false;

  if (branchMergedInGit(branch)) {
    updateTask(task.id, { merged: 1 });
    logEvent(task.id, 'merge_completed', 'Rule 0c: write-race victim — branch was already merged');
    return true;
  }
  return false;
}

function rule1GhostRunner(task) {
  if (task.status !== 'running') return false;
  if (!task.pid) return false;

  if (!isPidAlive(task.pid)) {
    updateTask(task.id, {
      status: 'failed',
      error: `Ghost runner: PID ${task.pid} is no longer alive`,
      finishedAt: new Date().toISOString(),
    });
    logEvent(task.id, 'failed', `Rule 1: ghost runner — PID ${task.pid} dead`);
    return true;
  }
  return false;
}

function rules2and3BinaryOrHook(task) {
  if (task.status !== 'failed') return false;
  const err = (task.error || '').toLowerCase();

  const isBinaryMissing = err.includes('enoent') || (err.includes('claude') && err.includes('not found'));
  const isHookBlocked = err.includes('hook') && err.includes('denied');

  if (isBinaryMissing || isHookBlocked) {
    const reason = isBinaryMissing ? 'binary missing (ENOENT)' : 'hook blocked';
    updateTask(task.id, {
      escalation: `No retry: ${reason}`,
    });
    logEvent(task.id, 'failed', `Rules 2-3: ${reason} — escalation, no retry`);
    return true;
  }
  return false;
}

function rules4and5StaleOrRateLimit(task) {
  if (task.status !== 'failed') return false;
  const err = (task.error || '').toLowerCase();

  const isStaleSession = err.includes('no conversation found');
  const isRateLimit = err.includes('rate limit') || err.includes('529') || err.includes('overloaded');

  if (!isStaleSession && !isRateLimit) return false;

  const maxRetries = task.maxRetries ?? MAX_RETRIES_DEFAULT;
  const retryCount = task.retryCount ?? 0;

  if (retryCount >= maxRetries) {
    updateTask(task.id, {
      escalation: `Max retries (${maxRetries}) exhausted`,
    });
    logEvent(task.id, 'failed', `Rules 4-5: max retries exhausted (${retryCount}/${maxRetries})`);
    return true;
  }

  const reason = isStaleSession ? 'stale session' : 'rate limit / overloaded';
  updateTask(task.id, {
    status: 'pending',
    retryCount: retryCount + 1,
    retryAfter: new Date(Date.now() + RETRY_BACKOFF_MS).toISOString(),
    error: null,
  });
  logEvent(
    task.id,
    'retry',
    `Rules 4-5: ${reason} — retry ${retryCount + 1}/${maxRetries}, backoff 60s`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Scan orchestrator
// ---------------------------------------------------------------------------

/**
 * Run a single recovery scan across all tasks.
 * Returns an array of { taskId, rule, action } for every repair performed.
 */
export function runRecoveryScan() {
  const tasks = getAllTasks();
  const repairs = [];

  for (const task of tasks) {
    // Skip tasks that don't need recovery
    if (task.status === 'done' || task.status === 'archived' || task.status === 'pending') continue;

    if (rule0aZombieRetry(task)) {
      repairs.push({ taskId: task.id, rule: '0a', action: 'zombie_retry_failed' });
      continue;
    }
    if (rule0bStuckMerge(task)) {
      repairs.push({ taskId: task.id, rule: '0b', action: 'stuck_merge_resolved' });
      continue;
    }
    if (rule0cWriteRaceVictim(task)) {
      repairs.push({ taskId: task.id, rule: '0c', action: 'write_race_fixed' });
      continue;
    }
    if (rule1GhostRunner(task)) {
      repairs.push({ taskId: task.id, rule: '1', action: 'ghost_runner_failed' });
      continue;
    }
    if (rules2and3BinaryOrHook(task)) {
      repairs.push({ taskId: task.id, rule: '2-3', action: 'escalation_no_retry' });
      continue;
    }
    if (rules4and5StaleOrRateLimit(task)) {
      repairs.push({ taskId: task.id, rule: '4-5', action: 'auto_retry_or_exhausted' });
      continue;
    }
  }

  if (repairs.length > 0) {
    console.log(`[recovery] scan complete — ${repairs.length} repair(s)`);
  }
  return repairs;
}

/**
 * Start the recovery engine on a 30-second interval.
 * Returns a cleanup function that stops the interval.
 */
export function startRecoveryEngine() {
  console.log('[recovery] engine started (interval: 30s)');
  const intervalId = setInterval(() => {
    try {
      runRecoveryScan();
    } catch (err) {
      console.error('[recovery] scan error:', err.message);
    }
  }, SCAN_INTERVAL_MS);

  return function stopRecoveryEngine() {
    clearInterval(intervalId);
    console.log('[recovery] engine stopped');
  };
}
