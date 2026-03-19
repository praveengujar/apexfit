/**
 * Workforce — Express 5 API server.
 *
 * Control plane for managing autonomous Claude Code agent sessions.
 * Runs on port 3740 with WebSocket broadcast for real-time UI updates.
 */

import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
  statSync,
} from 'node:fs';
import { appendFile as appendFileAsync } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

import {
  getDb,
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getRunningTasks,
  getPendingTasks,
  claimTask,
  releaseTaskClaim,
  getStaleClaims,
  registerWorker,
  removeWorker,
  getWorker,
} from './db.js';
import { logEvent, getTaskTimeline } from './task-events.js';
import { startRecoveryEngine, setProjectDir } from './recovery-engine.js';
import {
  classifyTier,
  estimateCost,
  recordActualCost,
  getCostModel,
  loadCostModel,
} from './costModel.js';
import { estimateTaskCost } from './taskCost.js';
import {
  createToken,
  getToken,
  cancelTask as cancelTaskToken,
  removeToken,
} from './projectState.js';
import { searchCode } from './codeSearch.js';
import {
  isTmuxAvailable, createSession, sendKeys, capturePane,
  killSession, listSessions, hasSession, getSessionPid, isSessionAlive,
} from './tmux.js';
import { loadProfiles, getProfile, listProfiles } from './profiles.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3740', 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '10', 10);
function findClaudeCli() {
  const explicit = process.env.CLAUDE_CLI;
  if (explicit) return explicit;

  // Try common locations
  const candidates = [
    join(homedir(), '.local', 'bin', 'claude'),
    join(homedir(), 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // Fall back to just 'claude' and hope it's on PATH
  return 'claude';
}

const CLAUDE_CLI = findClaudeCli();
const TASK_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const STUCK_NUDGE = 8 * 60 * 1000; // 8 minutes
const AUTO_ARCHIVE_DELAY = 5 * 60 * 1000; // 5 minutes
const MERGE_LOCKS = new Map(); // per-repo merge serialization
let stopRecovery = null;

// PROJECT_DIR: the git repo where Claude workers operate.
// Defaults to cwd but can be overridden to point at any project.
const PROJECT_DIR = resolve(process.env.PROJECT_DIR || process.cwd());

const TASKS_DIR = join(homedir(), '.claude', 'tasks');
const LOGS_DIR = join(homedir(), '.claude', 'logs');
const BACKLOG_PATH = resolve(process.cwd(), 'backlog.json');

// ---------------------------------------------------------------------------
// Anthropic SDK — lazy init
// ---------------------------------------------------------------------------
let _anthropic = null;
let _anthropicUnavailable = false;

async function getAnthropicClient() {
  if (_anthropic) return _anthropic;
  if (_anthropicUnavailable) return null;

  let apiKey = process.env.ANTHROPIC_API_KEY || null;

  if (!apiKey) {
    try {
      const claudeConfigPath = join(homedir(), '.claude.json');
      const raw = readFileSync(claudeConfigPath, 'utf8');
      const config = JSON.parse(raw);
      apiKey = config.primaryApiKey || null;
    } catch {
      // ignore
    }
  }

  if (!apiKey) {
    console.warn('[server] No Anthropic API key found — AI routes will return 503');
    _anthropicUnavailable = true;
    return null;
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

/**
 * Call Haiku for a one-shot completion.
 */
async function callHaiku(systemPrompt, userMessage, maxTokens = 1024) {
  const client = await getAnthropicClient();
  if (!client) return null;

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return resp.content?.[0]?.text ?? '';
}

// ---------------------------------------------------------------------------
// Express + HTTP + WebSocket setup
// ---------------------------------------------------------------------------
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// WebSocket broadcast
// ---------------------------------------------------------------------------
function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  }
}

let _broadcastTimer = null;
async function broadcastTasks() {
  if (_broadcastTimer) return;
  _broadcastTimer = setTimeout(() => {
    _broadcastTimer = null;
    broadcast('tasks', getAllTasks());
  }, 100);
}

// ---------------------------------------------------------------------------
// Backlog file helpers
// ---------------------------------------------------------------------------
function readBacklog() {
  try {
    const raw = readFileSync(BACKLOG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

function writeBacklog(data) {
  writeFileSync(BACKLOG_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Ensure directories
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Output extraction helpers
// ---------------------------------------------------------------------------
function extractTaskOutput(stdout) {
  if (!stdout) return '';
  // Return the last meaningful chunk (last 4000 chars) to keep output manageable
  const trimmed = stdout.trim();
  return trimmed.length > 4000 ? trimmed.slice(-4000) : trimmed;
}

function extractSessionId(stderr) {
  if (!stderr) return null;
  // Claude CLI prints session info to stderr
  const match = stderr.match(/session[_\s]*id[:\s]+([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Git helpers — use execFileSync to avoid shell injection
// ---------------------------------------------------------------------------
function gitExec(args, options = {}) {
  return execFileSync('git', args, { stdio: 'pipe', ...options }).toString().trim();
}

// ---------------------------------------------------------------------------
// Core: promotePending
// ---------------------------------------------------------------------------
async function promotePending() {
  const running = getRunningTasks();
  let slots = MAX_CONCURRENT - running.length;
  if (slots <= 0) return;

  const pending = getPendingTasks();
  for (const task of pending) {
    if (slots <= 0) break;
    const claimed = claimTask(task.id, 'server');
    if (!claimed) continue;

    try {
      await spawnWorker(task);
      slots--;
    } catch (err) {
      console.error(`[promotePending] Failed to spawn worker for ${task.id}:`, err.message);
      releaseTaskClaim(task.id);
      updateTask(task.id, { status: 'failed', error: `Spawn failed: ${err.message}` });
    }
  }

  await broadcastTasks();
}

// ---------------------------------------------------------------------------
// Core: spawnWorker
// ---------------------------------------------------------------------------
async function spawnWorker(task) {
  const taskId = task.id;
  const repoRoot = PROJECT_DIR;
  const worktreePath = join(repoRoot, 'wf', taskId);
  const branchName = `wf/${taskId}`;

  // 1. Create git worktree
  try {
    gitExec(['worktree', 'add', worktreePath, '-b', branchName], { cwd: repoRoot });
  } catch (err) {
    throw new Error(`git worktree add failed: ${err.stderr?.toString() || err.message}`);
  }

  // 2. Build effective prompt with context
  let effectivePrompt = task.prompt;

  // Add context: open tasks on same project
  try {
    const allTasks = getAllTasks();
    const projectTasks = allTasks.filter(
      (t) => t.project === task.project && t.id !== taskId && t.status === 'running',
    );
    if (projectTasks.length > 0) {
      const taskList = projectTasks.map((t) => `  - [${t.status}] ${t.prompt}`).join('\n');
      effectivePrompt += `\n\n[Context] Other active tasks on this project:\n${taskList}`;
    }
  } catch {
    // ignore context errors
  }

  // Add recent git log context
  try {
    const gitLog = gitExec(['log', '--oneline', '-5'], { cwd: repoRoot });
    if (gitLog) {
      effectivePrompt += `\n\n[Context] Recent commits:\n${gitLog}`;
    }
  } catch {
    // ignore
  }

  // Add project memory if available
  try {
    const memoryPath = join(repoRoot, '.claude', 'project-memory.md');
    if (existsSync(memoryPath)) {
      const memory = readFileSync(memoryPath, 'utf8').trim();
      if (memory) {
        effectivePrompt += `\n\n[Project Memory]\n${memory}`;
      }
    }
  } catch {
    // ignore
  }

  // Add feedback examples if available
  try {
    const feedbackPath = join(TASKS_DIR, 'feedback.jsonl');
    if (existsSync(feedbackPath)) {
      const lines = readFileSync(feedbackPath, 'utf8').trim().split('\n').filter(Boolean);
      const recent = lines.slice(-5);
      const examples = recent
        .map((line) => {
          try {
            const fb = JSON.parse(line);
            return `  - [${fb.type}] ${fb.prompt}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (examples.length > 0) {
        effectivePrompt += `\n\n[Context] Recent feedback:\n${examples.join('\n')}`;
      }
    }
  } catch {
    // ignore
  }

  // 3. Spawn Claude CLI
  ensureDir(TASKS_DIR);
  const logPath = join(TASKS_DIR, `${taskId}.log`);

  const useTmux = isTmuxAvailable();
  const tmuxSession = `wf-${taskId.slice(0, 8)}`; // tmux session names must be short

  if (useTmux) {
    // Build the full command string for tmux
    const cliArgs = [CLAUDE_CLI, '--print', '--dangerously-skip-permissions', '-p', JSON.stringify(effectivePrompt)];
    const fullCommand = cliArgs.map(a => typeof a === 'string' && a.includes(' ') ? `"${a.replace(/"/g, '\\"')}"` : a).join(' ');

    try {
      createSession(tmuxSession, fullCommand, worktreePath);
    } catch (err) {
      throw new Error(`tmux session creation failed: ${err.message}`);
    }

    const pid = getSessionPid(tmuxSession) || 0;

    // Register worker
    registerWorker(taskId, pid, logPath);

    // Update task
    updateTask(taskId, {
      status: 'running',
      pid,
      startedAt: new Date().toISOString(),
      worktreePath,
      branch: branchName,
      tmuxSession,
    });

    logEvent(taskId, 'task_started', `tmux=${tmuxSession} pid=${pid}`);

    // Start output capture loop — poll tmux pane every 2 seconds
    let lastCaptureLength = 0;
    const captureInterval = setInterval(() => {
      try {
        if (!hasSession(tmuxSession)) {
          clearInterval(captureInterval);
          // Session ended — capture final output and handle exit
          const finalOutput = capturePane(tmuxSession);
          handleTmuxWorkerExit(taskId, finalOutput);
          return;
        }

        const content = capturePane(tmuxSession);
        if (content.length > lastCaptureLength) {
          const newContent = content.slice(lastCaptureLength);
          lastCaptureLength = content.length;
          appendFileAsync(logPath, newContent).catch(() => {});
        }
      } catch {
        // ignore capture errors
      }
    }, 2000);

    // Timeout watchdog
    const timeoutTimer = setTimeout(() => {
      console.warn(`[spawnWorker] Task ${taskId} timed out — killing tmux session`);
      logEvent(taskId, 'timeout', `Killed after ${TASK_TIMEOUT / 1000}s`);
      killSession(tmuxSession);
      clearInterval(captureInterval);
    }, TASK_TIMEOUT);

    // Stuck nudge
    const nudgeTimer = setTimeout(() => {
      logEvent(taskId, 'stuck_warning', `Running for ${STUCK_NUDGE / 1000}s`);
    }, STUCK_NUDGE);

    // Check for session end every 3 seconds
    const exitCheckInterval = setInterval(async () => {
      if (!hasSession(tmuxSession) || !isSessionAlive(tmuxSession)) {
        clearInterval(exitCheckInterval);
        clearInterval(captureInterval);
        clearTimeout(timeoutTimer);
        clearTimeout(nudgeTimer);

        const finalOutput = capturePane(tmuxSession);
        await handleTmuxWorkerExit(taskId, finalOutput);
      }
    }, 3000);

    // Cancellation token
    const token = createToken(taskId);
    token.onCancel(() => {
      killSession(tmuxSession);
      clearInterval(exitCheckInterval);
      clearInterval(captureInterval);
      clearTimeout(timeoutTimer);
      clearTimeout(nudgeTimer);
    });

    return; // Don't fall through to the spawn path
  }

  const child = spawn(CLAUDE_CLI, ['--print', '--dangerously-skip-permissions', '-p', effectivePrompt], {
    cwd: worktreePath,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  child.on('error', (err) => {
    console.error(`[spawnWorker] Spawn error for ${taskId}:`, err.message);
    clearTimeout(timeoutTimer);
    clearTimeout(nudgeTimer);
    updateTask(taskId, {
      status: 'failed',
      error: `Spawn error: ${err.message}`,
      completedAt: new Date().toISOString(),
    });
    logEvent(taskId, 'failed', `Spawn error: ${err.message}`);
    releaseTaskClaim(taskId);
    removeWorker(taskId);
    removeToken(taskId);
    broadcastTasks();
  });

  const pid = child.pid;

  // 4. Register worker
  registerWorker(taskId, pid, logPath);

  // 5. Update task
  updateTask(taskId, {
    status: 'running',
    pid,
    startedAt: new Date().toISOString(),
    worktreePath,
    branch: branchName,
  });

  // 6. Log events
  logEvent(taskId, 'task_started', `pid=${pid}`);
  logEvent(taskId, 'claude_pid_assigned', `pid=${pid}`);

  // Collect stdout/stderr
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    appendFileAsync(logPath, chunk).catch(() => {});
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    appendFileAsync(logPath, chunk).catch(() => {});
  });

  // 7. Timeout watchdog (10 min)
  const timeoutTimer = setTimeout(() => {
    console.warn(`[spawnWorker] Task ${taskId} timed out after ${TASK_TIMEOUT / 1000}s — killing`);
    logEvent(taskId, 'timeout', `Killed after ${TASK_TIMEOUT / 1000}s`);
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }, TASK_TIMEOUT);

  // 8. Stuck nudge (8 min)
  const nudgeTimer = setTimeout(() => {
    console.warn(`[spawnWorker] Task ${taskId} has been running for ${STUCK_NUDGE / 1000}s — possible stuck`);
    logEvent(taskId, 'stuck_warning', `Running for ${STUCK_NUDGE / 1000}s`);
  }, STUCK_NUDGE);

  // 9. On exit: handleWorkerExit
  child.on('close', async (code) => {
    clearTimeout(timeoutTimer);
    clearTimeout(nudgeTimer);
    await handleWorkerExit(task, code, stdout, stderr);
  });

  // 10. Create cancellation token
  const token = createToken(taskId);
  token.onCancel(() => {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  });
}

// ---------------------------------------------------------------------------
// Core: handleTmuxWorkerExit
// ---------------------------------------------------------------------------
async function handleTmuxWorkerExit(taskId, output) {
  logEvent(taskId, 'claude_exited', 'tmux session ended');

  const task = getTask(taskId);
  if (!task) return;

  const worktreePath = task.worktreePath;
  const cleanOutput = (output || '').slice(-4000);

  // Check for file changes
  let filesChanged = false;
  if (worktreePath) {
    try {
      const diff = gitExec(['diff', '--stat', 'HEAD'], { cwd: worktreePath });
      filesChanged = diff.length > 0;
    } catch {
      try {
        const untracked = gitExec(['status', '--porcelain'], { cwd: worktreePath });
        filesChanged = untracked.length > 0;
      } catch {
        filesChanged = false;
      }
    }
  }

  if (filesChanged) {
    // Commit changes
    try {
      gitExec(['add', '-A'], { cwd: worktreePath });
      gitExec(['commit', '-m', 'Task work', '--allow-empty'], { cwd: worktreePath });
    } catch { /* may already be committed */ }

    // Go to review status instead of auto-merge (Fix 4)
    updateTask(taskId, {
      status: 'review',
      output: cleanOutput,
      exitCode: 0,
    });
    logEvent(taskId, 'verification', 'Changes detected — awaiting review');
  } else {
    updateTask(taskId, {
      status: 'failed',
      output: cleanOutput,
      error: 'No files changed — zero-work guard triggered',
      exitCode: 0,
      completedAt: new Date().toISOString(),
    });
    logEvent(taskId, 'failed', 'Zero-work guard');
    cleanupWorktree(taskId, worktreePath);
  }

  // Cost tracking
  try {
    const costMatch = (output || '').match(/\$([0-9.]+)/);
    if (costMatch) {
      const actualCost = parseFloat(costMatch[1]);
      if (!isNaN(actualCost) && actualCost > 0) {
        recordActualCost(task.prompt, actualCost);
        updateTask(taskId, { cost: actualCost });
      }
    }
  } catch { /* ignore */ }

  releaseTaskClaim(taskId);
  removeWorker(taskId);
  removeToken(taskId);

  await broadcastTasks();
  await promotePending();
}

// ---------------------------------------------------------------------------
// Core: handleWorkerExit
// ---------------------------------------------------------------------------
async function handleWorkerExit(task, exitCode, stdout, stderr) {
  const taskId = task.id;

  // 1. Log exit
  logEvent(taskId, 'claude_exited', `exitCode=${exitCode}`);

  // 2. Parse output
  const output = extractTaskOutput(stdout);
  const sessionId = extractSessionId(stderr);

  if (sessionId) {
    updateTask(taskId, { sessionId });
  }

  // 3. Zero-work guard: did any files change?
  let filesChanged = false;
  const freshTask = getTask(taskId);
  const worktreePath = freshTask?.worktreePath;

  if (worktreePath) {
    try {
      const diff = gitExec(['diff', '--stat', 'HEAD'], { cwd: worktreePath });
      filesChanged = diff.length > 0;
    } catch {
      // Also check untracked files
      try {
        const untracked = gitExec(['status', '--porcelain'], { cwd: worktreePath });
        filesChanged = untracked.length > 0;
      } catch {
        filesChanged = false;
      }
    }
  }

  // 4 & 5. Decide outcome
  if (exitCode === 0 && filesChanged) {
    try {
      gitExec(['add', '-A'], { cwd: worktreePath });
      gitExec(['commit', '-m', 'Task work', '--allow-empty'], { cwd: worktreePath });
    } catch { /* may already be committed */ }

    // Check if autoMerge flag is set
    if (freshTask.autoMerge) {
      updateTask(taskId, { output, exitCode });
      await mergeWorktree(freshTask);
    } else {
      updateTask(taskId, {
        status: 'review',
        output,
        exitCode: 0,
      });
      logEvent(taskId, 'verification', 'Changes detected — awaiting review');
    }
  } else {
    const errorMsg = exitCode !== 0
      ? `Claude exited with code ${exitCode}. ${stderr || ''}`.trim()
      : 'No files changed — zero-work guard triggered';
    updateTask(taskId, {
      status: 'failed',
      output,
      error: errorMsg,
      exitCode,
      completedAt: new Date().toISOString(),
    });
    logEvent(taskId, 'failed', errorMsg);

    // Cleanup worktree on failure
    cleanupWorktree(taskId, worktreePath);
  }

  // 6. Record actual cost if available
  try {
    const costMatch = (stdout || '').match(/\$([0-9.]+)/);
    if (costMatch) {
      const actualCost = parseFloat(costMatch[1]);
      if (!isNaN(actualCost) && actualCost > 0) {
        recordActualCost(task.prompt, actualCost);
        updateTask(taskId, { cost: actualCost });
      }
    }
  } catch {
    // ignore cost parsing errors
  }

  // 7. Release claim, remove worker
  releaseTaskClaim(taskId);
  removeWorker(taskId);

  // 8. Cleanup token
  removeToken(taskId);

  // 9. Broadcast
  await broadcastTasks();

  // Try to promote next pending task
  await promotePending();
}

// ---------------------------------------------------------------------------
// Core: mergeWorktree
// ---------------------------------------------------------------------------
async function mergeWorktree(task) {
  const taskId = task.id;
  const repoRoot = PROJECT_DIR;
  const branchName = `wf/${taskId}`;
  const worktreePath = task.worktreePath || join(repoRoot, 'wf', taskId);

  // 1. Acquire per-repo merge lock
  const lockKey = repoRoot;
  while (MERGE_LOCKS.has(lockKey)) {
    await MERGE_LOCKS.get(lockKey);
  }

  let releaseLock;
  const lockPromise = new Promise((r) => {
    releaseLock = r;
  });
  MERGE_LOCKS.set(lockKey, lockPromise);

  try {
    // 2. Merge
    logEvent(taskId, 'merge_started');
    gitExec(['merge', '--no-ff', branchName], { cwd: repoRoot });

    // 4. Update task
    updateTask(taskId, {
      merged: 1,
      status: 'done',
      completedAt: new Date().toISOString(),
    });

    // 5. Log merge
    logEvent(taskId, 'merge_completed');
  } catch (mergeErr) {
    // 3. Check if conflict is only status.md
    const errMsg = mergeErr.stderr?.toString() || mergeErr.message || '';

    let resolved = false;
    try {
      const conflicts = gitExec(['diff', '--name-only', '--diff-filter=U'], { cwd: repoRoot });

      if (conflicts === 'status.md') {
        gitExec(['checkout', '--theirs', 'status.md'], { cwd: repoRoot });
        gitExec(['add', 'status.md'], { cwd: repoRoot });
        gitExec(['commit', '--no-edit'], { cwd: repoRoot });
        resolved = true;

        updateTask(taskId, {
          merged: 1,
          status: 'done',
          completedAt: new Date().toISOString(),
        });
        logEvent(taskId, 'merge_completed', 'auto-resolved status.md conflict');
      }
    } catch {
      // conflict resolution failed
    }

    if (!resolved) {
      // 9. Merge failed
      try {
        gitExec(['merge', '--abort'], { cwd: repoRoot });
      } catch {
        // ignore
      }

      updateTask(taskId, {
        mergeFailed: 1,
        status: 'failed',
        error: `Merge failed: ${errMsg}`,
        completedAt: new Date().toISOString(),
      });
      logEvent(taskId, 'merge_failed', errMsg);
    }
  } finally {
    // 6. Release merge lock
    MERGE_LOCKS.delete(lockKey);
    releaseLock();
  }

  // 7. Schedule auto-archive
  scheduleAutoArchive(taskId);

  // 8. Cleanup worktree with retries
  cleanupWorktree(taskId, worktreePath);

  // 10. Broadcast
  await broadcastTasks();
}

// ---------------------------------------------------------------------------
// Worktree cleanup with retries
// ---------------------------------------------------------------------------
function cleanupWorktree(taskId, worktreePath) {
  if (!worktreePath) return;

  const repoRoot = PROJECT_DIR;
  const branchName = `wf/${taskId}`;

  let attempts = 0;
  const maxAttempts = 3;

  function attempt() {
    attempts++;
    try {
      gitExec(['worktree', 'remove', worktreePath, '--force'], { cwd: repoRoot });
    } catch {
      if (attempts < maxAttempts) {
        setTimeout(attempt, 600 * attempts);
        return;
      }
      console.warn(`[cleanupWorktree] Failed to remove worktree for ${taskId} after ${maxAttempts} attempts`);
    }

    // Try to delete the branch too
    try {
      gitExec(['branch', '-D', branchName], { cwd: repoRoot });
    } catch {
      // ignore — branch may not exist or may be the current branch
    }
  }

  attempt();
}

// ---------------------------------------------------------------------------
// Core: scheduleAutoArchive
// ---------------------------------------------------------------------------
function scheduleAutoArchive(taskId) {
  setTimeout(() => {
    try {
      const task = getTask(taskId);
      if (task && task.status === 'done' && !task.pinned && !task.needsInput) {
        updateTask(taskId, {
          status: 'archived',
          archivedAt: new Date().toISOString(),
        });
        logEvent(taskId, 'archived', 'auto-archived after delay');
        broadcastTasks();
      }
    } catch (err) {
      console.error(`[autoArchive] Error archiving ${taskId}:`, err.message);
    }
  }, AUTO_ARCHIVE_DELAY);
}

// =========================================================================
// API ROUTES
// =========================================================================

// ---- Health ----
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---- Task Management ----

// POST /api/tasks — create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { prompt, project, profile, autoMerge } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const id = randomUUID();
    const task = createTask({ id, prompt, project, profile, autoMerge });
    logEvent(id, 'task_created');

    // Attempt to start it immediately if capacity is available
    try {
      await promotePending();
    } catch {
      // task stays pending — that's fine
    }

    res.status(201).json(task);
  } catch (err) {
    console.error(`[POST /api/tasks] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks — list all tasks
app.get('/api/tasks', (req, res) => {
  try {
    res.json(getAllTasks());
  } catch (err) {
    console.error(`[GET /api/tasks] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id — single task
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  } catch (err) {
    console.error(`[GET /api/tasks/:id] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id/events — task timeline
app.get('/api/tasks/:id/events', (req, res) => {
  try {
    const events = getTaskTimeline(req.params.id);
    res.json(events);
  } catch (err) {
    console.error(`[GET /api/tasks/:id/events] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/reply — send reply to a running task
app.post('/api/tasks/:id/reply', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (task.status !== 'running') return res.status(400).json({ error: 'task is not running' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Use tmux sendKeys if available and task has a tmux session
    if (isTmuxAvailable() && task.tmuxSession && hasSession(task.tmuxSession)) {
      sendKeys(task.tmuxSession, message);
      logEvent(task.id, 'reply_sent', `via tmux: ${message}`);
      return res.json({ ok: true, method: 'tmux' });
    }

    // Fallback: write reply file (limited usefulness)
    ensureDir(TASKS_DIR);
    const replyPath = join(TASKS_DIR, `${task.id}.reply`);
    writeFileSync(replyPath, message, 'utf8');
    logEvent(task.id, 'reply_sent', message);
    res.json({ ok: true, method: 'file' });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/reply] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/cancel — cancel a running task
app.post('/api/tasks/:id/cancel', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    // Kill process if running
    if (task.pid) {
      try {
        process.kill(task.pid, 'SIGTERM');
      } catch {
        // Process may already be dead
      }
    }

    updateTask(task.id, {
      status: 'failed',
      error: 'Cancelled by user',
      completedAt: new Date().toISOString(),
    });
    logEvent(task.id, 'cancelled', 'User-initiated cancellation');

    // Cleanup worktree
    if (task.worktreePath) {
      cleanupWorktree(task.id, task.worktreePath);
    }

    // Cancel token
    cancelTaskToken(task.id);

    // Release claim & worker
    releaseTaskClaim(task.id);
    removeWorker(task.id);

    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/cancel] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/retry — retry a task
app.post('/api/tasks/:id/retry', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const updated = updateTask(task.id, {
      status: 'pending',
      error: null,
      output: null,
      pid: null,
      sessionId: null,
      startedAt: null,
      completedAt: null,
      exitCode: null,
      merged: 0,
      mergeFailed: 0,
      retryCount: (task.retryCount || 0) + 1,
    });

    logEvent(task.id, 'retry', `retry #${updated.retryCount}`);

    try {
      await promotePending();
    } catch {
      // stays pending
    }

    res.json(updated);
  } catch (err) {
    console.error(`[POST /api/tasks/:id/retry] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — archive a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    updateTask(task.id, {
      status: 'archived',
      archivedAt: new Date().toISOString(),
    });
    logEvent(task.id, 'archived', 'User-initiated archive');

    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[DELETE /api/tasks/:id] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id/live — SSE live output stream
app.get('/api/tasks/:id/live', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const logPath = join(TASKS_DIR, `${task.id}.log`);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send existing content and track character offset
    let lastOffset = 0;
    if (existsSync(logPath)) {
      try {
        const existing = readFileSync(logPath, 'utf8');
        if (existing) {
          res.write(`data: ${JSON.stringify({ content: existing })}\n\n`);
          lastOffset = existing.length;
        }
      } catch {
        // ignore
      }
    }

    // Poll for new content every second
    const interval = setInterval(() => {
      try {
        if (!existsSync(logPath)) return;

        const content = readFileSync(logPath, 'utf8');
        if (content.length > lastOffset) {
          const newContent = content.slice(lastOffset);
          lastOffset = content.length;
          if (newContent) {
            res.write(`data: ${JSON.stringify({ content: newContent })}\n\n`);
          }
        }

        // Check if task is still running
        const currentTask = getTask(req.params.id);
        if (currentTask && currentTask.status !== 'running') {
          res.write(`data: ${JSON.stringify({ done: true, status: currentTask.status })}\n\n`);
          clearInterval(interval);
          res.end();
        }
      } catch {
        // ignore polling errors
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (err) {
    console.error(`[GET /api/tasks/:id/live] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/feedback — record feedback
app.post('/api/tasks/:id/feedback', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const { type } = req.body;
    if (type !== 'up' && type !== 'down') {
      return res.status(400).json({ error: 'type must be "up" or "down"' });
    }

    ensureDir(TASKS_DIR);
    const feedbackPath = join(TASKS_DIR, 'feedback.jsonl');
    const entry = JSON.stringify({
      taskId: task.id,
      type,
      prompt: task.prompt,
      project: task.project,
      timestamp: new Date().toISOString(),
    });
    appendFileSync(feedbackPath, entry + '\n', 'utf8');

    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/feedback] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Change Review Routes ----

// GET /api/tasks/:id/diff — get diff for review
app.get('/api/tasks/:id/diff', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const repoRoot = PROJECT_DIR;
    const branchName = task.branch || `wf/${task.id}`;

    let diff = '';
    let files = [];
    let additions = 0;
    let deletions = 0;

    try {
      diff = gitExec(['diff', `main...${branchName}`], { cwd: repoRoot });
    } catch {
      try {
        diff = gitExec(['diff', `HEAD...${branchName}`], { cwd: repoRoot });
      } catch {
        diff = '(unable to generate diff)';
      }
    }

    try {
      const stat = gitExec(['diff', '--stat', `main...${branchName}`], { cwd: repoRoot });
      const lines = stat.split('\n');
      for (const line of lines) {
        const fileMatch = line.match(/^\s*(.+?)\s+\|\s+(\d+)/);
        if (fileMatch) files.push(fileMatch[1].trim());
        const addMatch = line.match(/(\d+) insertion/);
        const delMatch = line.match(/(\d+) deletion/);
        if (addMatch) additions += parseInt(addMatch[1], 10);
        if (delMatch) deletions += parseInt(delMatch[1], 10);
      }
    } catch { /* ignore */ }

    res.json({ diff, files, additions, deletions });
  } catch (err) {
    console.error(`[GET /api/tasks/:id/diff] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/approve — approve and merge
app.post('/api/tasks/:id/approve', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (task.status !== 'review') return res.status(400).json({ error: 'task is not in review status' });

    await mergeWorktree(task);
    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/approve] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/reject — reject and discard changes
app.post('/api/tasks/:id/reject', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (task.status !== 'review') return res.status(400).json({ error: 'task is not in review status' });

    updateTask(task.id, {
      status: 'failed',
      error: 'Changes rejected by user',
      completedAt: new Date().toISOString(),
    });
    logEvent(task.id, 'rejected', 'User rejected changes');

    cleanupWorktree(task.id, task.worktreePath);
    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/reject] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Pause/Resume Routes ----

// POST /api/tasks/:id/pause — pause a running task
app.post('/api/tasks/:id/pause', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (task.status !== 'running') return res.status(400).json({ error: 'task is not running' });

    if (!isTmuxAvailable() || !task.tmuxSession) {
      return res.status(400).json({ error: 'pause requires tmux sessions' });
    }

    updateTask(task.id, { status: 'paused' });
    logEvent(task.id, 'paused', 'User paused task');

    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/pause] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/resume — resume a paused task
app.post('/api/tasks/:id/resume', async (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    if (task.status !== 'paused') return res.status(400).json({ error: 'task is not paused' });

    if (!task.tmuxSession || !hasSession(task.tmuxSession)) {
      return res.status(400).json({ error: 'tmux session no longer exists' });
    }

    updateTask(task.id, { status: 'running' });
    logEvent(task.id, 'resumed', 'User resumed task');

    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/resume] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Terminal Routes ----

// GET /api/tasks/:id/terminal — SSE stream of tmux pane content
app.get('/api/tasks/:id/terminal', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    if (!isTmuxAvailable() || !task.tmuxSession) {
      return res.status(400).json({ error: 'terminal requires tmux' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let lastContent = '';

    const interval = setInterval(() => {
      try {
        if (!hasSession(task.tmuxSession)) {
          res.write(`data: ${JSON.stringify({ type: 'status', data: 'closed' })}\n\n`);
          clearInterval(interval);
          res.end();
          return;
        }

        const content = capturePane(task.tmuxSession);
        if (content !== lastContent) {
          lastContent = content;
          res.write(`data: ${JSON.stringify({ type: 'output', data: content })}\n\n`);
        }
      } catch {
        // ignore
      }
    }, 500);

    req.on('close', () => clearInterval(interval));
  } catch (err) {
    console.error(`[GET /api/tasks/:id/terminal] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/terminal — send input to tmux session
app.post('/api/tasks/:id/terminal', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input is required' });

    if (!isTmuxAvailable() || !task.tmuxSession || !hasSession(task.tmuxSession)) {
      return res.status(400).json({ error: 'no active tmux session' });
    }

    sendKeys(task.tmuxSession, input);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/tasks/:id/terminal] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Profiles Route ----

// GET /api/profiles — list available agent profiles
app.get('/api/profiles', (req, res) => {
  try {
    res.json(listProfiles());
  } catch (err) {
    console.error(`[GET /api/profiles] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- AI-Powered Routes ----

// POST /api/tasks/refine — refine a prompt using Haiku
app.post('/api/tasks/refine', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await callHaiku(
      'You are a prompt engineer. Refine the given task prompt to be clearer, more specific, and more actionable for an AI coding agent. Return only the refined prompt, no explanation.',
      prompt,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    res.json({ refined: result });
  } catch (err) {
    console.error(`[POST /api/tasks/refine] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/decompose — break prompt into subtasks
app.post('/api/tasks/decompose', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await callHaiku(
      'You decompose coding tasks into smaller subtasks. Return a JSON array of objects with "prompt", "tier" (simple/medium/complex), and "estimatedCost" (number in dollars). Return ONLY the JSON array, no markdown fences or explanation.',
      `Decompose this task into subtasks:\n\n${prompt}`,
      2048,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    let subtasks;
    try {
      subtasks = JSON.parse(result);
    } catch {
      // Try extracting JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      subtasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [{ prompt, tier: 'complex', estimatedCost: 0.5 }];
    }

    res.json({ subtasks });
  } catch (err) {
    console.error(`[POST /api/tasks/decompose] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/analyze — admission scope check
app.post('/api/tasks/analyze', (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const wordCount = prompt.split(/\s+/).length;
    const suggestions = [];
    let admitted = true;
    let reason = 'Task looks good';

    // Word count heuristics
    if (wordCount < 3) {
      admitted = false;
      reason = 'Prompt is too short — provide more detail';
      suggestions.push('Add specifics about what files, functions, or behavior to change');
    }

    if (wordCount > 500) {
      admitted = false;
      reason = 'Prompt is too long — consider decomposing into subtasks';
      suggestions.push('Use the decompose endpoint to break this into smaller tasks');
    }

    // Complexity heuristics
    const complexPatterns = [
      /refactor.*entire/i,
      /rewrite.*from scratch/i,
      /migrate.*all/i,
      /redesign/i,
    ];
    const isOverlyComplex = complexPatterns.some((p) => p.test(prompt));
    if (isOverlyComplex) {
      admitted = false;
      reason = 'Task appears too broad for a single agent run';
      suggestions.push('Break into focused sub-tasks targeting specific files or modules');
    }

    // Vagueness heuristics
    const vaguePatterns = [/make it better/i, /fix everything/i, /improve the code/i, /clean up/i];
    const isVague = vaguePatterns.some((p) => p.test(prompt));
    if (isVague) {
      suggestions.push('Be more specific about what needs to change and why');
      if (admitted) {
        reason = 'Task admitted but could benefit from more specificity';
      }
    }

    const estimate = estimateTaskCost(prompt);

    res.json({
      admitted,
      reason,
      suggestions,
      wordCount,
      tier: estimate.tier,
      estimatedCost: estimate.totalCost,
    });
  } catch (err) {
    console.error(`[POST /api/tasks/analyze] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suggest-replies — suggest replies for a Claude session
app.post('/api/suggest-replies', async (req, res) => {
  try {
    const { sessionId, context } = req.body;

    const result = await callHaiku(
      'You suggest short, actionable replies a developer might send to a Claude coding agent during an active session. Return a JSON array of exactly 3 short reply strings. Return ONLY the JSON array.',
      `Session context: ${context || 'Active coding session'}\n\nSuggest 3 useful replies the developer could send.`,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    let replies;
    try {
      replies = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      replies = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : ['Continue with the current approach', 'Show me what you have so far', 'Try a different approach'];
    }

    res.json({ replies });
  } catch (err) {
    console.error(`[POST /api/suggest-replies] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Backlog Routes ----

// GET /api/backlog
app.get('/api/backlog', (req, res) => {
  try {
    const backlog = readBacklog();
    res.json(backlog.items);
  } catch (err) {
    console.error(`[GET /api/backlog] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backlog — add item
app.post('/api/backlog', (req, res) => {
  try {
    const { title, description, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const backlog = readBacklog();
    const item = {
      id: randomUUID(),
      title,
      description: description || '',
      priority: priority || 'medium',
      score: 0,
      effort: null,
      createdAt: new Date().toISOString(),
    };

    backlog.items.push(item);
    writeBacklog(backlog);

    res.status(201).json(item);
  } catch (err) {
    console.error(`[POST /api/backlog] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/backlog/reorder — reorder items
app.put('/api/backlog/reorder', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of ids' });

    const backlog = readBacklog();
    const itemMap = new Map(backlog.items.map((item) => [item.id, item]));

    const reordered = [];
    for (const id of order) {
      const item = itemMap.get(id);
      if (item) {
        reordered.push(item);
        itemMap.delete(id);
      }
    }

    // Append any items not in the order list
    for (const item of itemMap.values()) {
      reordered.push(item);
    }

    backlog.items = reordered;
    writeBacklog(backlog);

    res.json(backlog.items);
  } catch (err) {
    console.error(`[PUT /api/backlog/reorder] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/backlog/:id — update item
app.put('/api/backlog/:id', (req, res) => {
  try {
    const backlog = readBacklog();
    const idx = backlog.items.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item not found' });

    const { title, description, priority } = req.body;
    if (title !== undefined) backlog.items[idx].title = title;
    if (description !== undefined) backlog.items[idx].description = description;
    if (priority !== undefined) backlog.items[idx].priority = priority;

    writeBacklog(backlog);
    res.json(backlog.items[idx]);
  } catch (err) {
    console.error(`[PUT /api/backlog/:id] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backlog/:id — remove item
app.delete('/api/backlog/:id', (req, res) => {
  try {
    const backlog = readBacklog();
    const idx = backlog.items.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item not found' });

    backlog.items.splice(idx, 1);
    writeBacklog(backlog);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[DELETE /api/backlog/:id] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backlog/chat — chat about the backlog
app.post('/api/backlog/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const backlog = readBacklog();
    const backlogSummary = backlog.items
      .map((item, i) => `${i + 1}. [${item.priority}] ${item.title}: ${item.description}`)
      .join('\n');

    const result = await callHaiku(
      `You are a project manager helping prioritize and discuss a product backlog. Here is the current backlog:\n\n${backlogSummary}\n\nAdditional context: ${context || 'none'}`,
      message,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    res.json({ response: result });
  } catch (err) {
    console.error(`[POST /api/backlog/chat] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backlog/generate — AI-generate backlog items
app.post('/api/backlog/generate', async (req, res) => {
  try {
    const { context } = req.body;

    const result = await callHaiku(
      'You generate product backlog items for software projects. Return a JSON array of objects with "title", "description", and "priority" (high/medium/low). Return ONLY the JSON array.',
      `Generate backlog items for this project context:\n\n${context || 'A web-based workflow management tool for autonomous coding agents'}`,
      2048,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    let items;
    try {
      items = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    res.json({ items });
  } catch (err) {
    console.error(`[POST /api/backlog/generate] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backlog/stack-rank — AI stack-rank backlog items
app.post('/api/backlog/stack-rank', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

    const itemsSummary = items
      .map((item, i) => `${i + 1}. [${item.priority || 'medium'}] ${item.title}: ${item.description || ''}`)
      .join('\n');

    const result = await callHaiku(
      'You are a project manager who stack-ranks backlog items by impact and urgency. Return a JSON array of the same items, reordered from highest to lowest priority. Each item should have "id", "title", "description", "priority", and a new "rank" field (1=highest). Return ONLY the JSON array.',
      `Stack-rank these backlog items:\n\n${itemsSummary}\n\nOriginal items JSON: ${JSON.stringify(items)}`,
      2048,
    );

    if (result === null) return res.status(503).json({ error: 'Anthropic API not configured' });

    let ranked;
    try {
      ranked = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      ranked = jsonMatch ? JSON.parse(jsonMatch[0]) : items;
    }

    res.json({ ranked });
  } catch (err) {
    console.error(`[POST /api/backlog/stack-rank] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Monitoring Routes ----

// GET /api/health-metrics
app.get('/api/health-metrics', (req, res) => {
  try {
    const allTasks = getAllTasks(true); // include archived
    const total = allTasks.length;

    const done = allTasks.filter((t) => t.status === 'done' || t.status === 'archived').length;
    const failed = allTasks.filter((t) => t.status === 'failed').length;
    const retried = allTasks.filter((t) => t.retryCount > 0).length;
    const oneShot = allTasks.filter(
      (t) => (t.status === 'done' || t.status === 'archived') && t.retryCount === 0,
    ).length;

    const doneRate = total > 0 ? done / total : 0;
    const failRate = total > 0 ? failed / total : 0;
    const retryRate = total > 0 ? retried / total : 0;
    const oneShotRate = done > 0 ? oneShot / done : 0;

    // Recent tasks (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentTasks = allTasks.filter((t) => t.createdAt > oneDayAgo).length;

    const suggestions = [];
    if (failRate > 0.3) suggestions.push('High failure rate — review prompt quality and task scope');
    if (oneShotRate < 0.5) suggestions.push('Low one-shot rate — consider more specific prompts');
    if (retryRate > 0.4) suggestions.push('Many retries — check for flaky tests or merge conflicts');

    res.json({
      doneRate: Math.round(doneRate * 100) / 100,
      failRate: Math.round(failRate * 100) / 100,
      retryRate: Math.round(retryRate * 100) / 100,
      oneShotRate: Math.round(oneShotRate * 100) / 100,
      uptime: process.uptime(),
      recentTasks,
      total,
      improvementSuggestions: suggestions,
    });
  } catch (err) {
    console.error(`[GET /api/health-metrics] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/adoption — tab visit analytics
app.get('/api/adoption', (req, res) => {
  try {
    const visitPath = join(TASKS_DIR, 'tab-visits.jsonl');
    const tabs = {};

    if (existsSync(visitPath)) {
      const lines = readFileSync(visitPath, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const tabName = entry.tab;
          if (!tabs[tabName]) {
            tabs[tabName] = { visits: 0, lastVisit: null, level: 'new' };
          }
          tabs[tabName].visits++;
          if (!tabs[tabName].lastVisit || entry.timestamp > tabs[tabName].lastVisit) {
            tabs[tabName].lastVisit = entry.timestamp;
          }

          // Level based on visit count
          if (tabs[tabName].visits >= 50) tabs[tabName].level = 'power';
          else if (tabs[tabName].visits >= 10) tabs[tabName].level = 'regular';
          else tabs[tabName].level = 'new';
        } catch {
          // skip malformed lines
        }
      }
    }

    res.json({ tabs });
  } catch (err) {
    console.error(`[GET /api/adoption] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/adoption — record tab visit
app.post('/api/adoption', (req, res) => {
  try {
    const { tab, timestamp } = req.body;
    if (!tab) return res.status(400).json({ error: 'tab is required' });

    ensureDir(TASKS_DIR);
    const visitPath = join(TASKS_DIR, 'tab-visits.jsonl');
    const entry = JSON.stringify({
      tab,
      timestamp: timestamp || new Date().toISOString(),
    });
    appendFileSync(visitPath, entry + '\n', 'utf8');

    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/adoption] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cost — aggregate cost data
app.get('/api/cost', (req, res) => {
  try {
    const allTasks = getAllTasks(true);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    const byTier = { simple: 0, medium: 0, complex: 0 };

    for (const task of allTasks) {
      const cost = task.cost || 0;
      if (cost <= 0) continue;

      const completedAt = task.completedAt || task.createdAt;
      const tier = classifyTier(task.prompt || '');
      byTier[tier] += cost;

      if (completedAt >= startOfToday) today += cost;
      if (completedAt >= startOfWeek) thisWeek += cost;
      if (completedAt >= startOfMonth) thisMonth += cost;
    }

    res.json({
      today: Math.round(today * 100) / 100,
      thisWeek: Math.round(thisWeek * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      byTier: {
        simple: Math.round(byTier.simple * 100) / 100,
        medium: Math.round(byTier.medium * 100) / 100,
        complex: Math.round(byTier.complex * 100) / 100,
      },
    });
  } catch (err) {
    console.error(`[GET /api/cost] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/servers — check health of configured dev servers
app.get('/api/servers', async (req, res) => {
  try {
    // Configured dev servers (can be extended via env or config file)
    const servers = [
      { name: 'Frontend Dev', url: 'http://localhost:5173' },
      { name: 'API Server', url: `http://localhost:${PORT}` },
    ];

    const results = await Promise.all(
      servers.map(async (srv) => {
        const start = Date.now();
        try {
          const resp = await fetch(srv.url, { signal: AbortSignal.timeout(3000) });
          return {
            name: srv.name,
            url: srv.url,
            healthy: resp.ok,
            responseTime: Date.now() - start,
          };
        } catch {
          return {
            name: srv.name,
            url: srv.url,
            healthy: false,
            responseTime: Date.now() - start,
          };
        }
      }),
    );

    res.json(results);
  } catch (err) {
    console.error(`[GET /api/servers] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/releases — parse CHANGELOG or git log
app.get('/api/releases', (req, res) => {
  try {
    const changelogPath = resolve(PROJECT_DIR, 'CHANGELOG.md');
    const releases = [];

    if (existsSync(changelogPath)) {
      const content = readFileSync(changelogPath, 'utf8');
      const sections = content.split(/^## /m).filter(Boolean);

      for (const section of sections) {
        const lines = section.trim().split('\n');
        const header = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();

        const versionMatch = header.match(/\[?v?(\d+\.\d+\.\d+)\]?/);
        const dateMatch = header.match(/(\d{4}-\d{2}-\d{2})/);

        releases.push({
          version: versionMatch ? versionMatch[1] : header,
          date: dateMatch ? dateMatch[1] : null,
          notes: body,
        });
      }
    } else {
      // Fall back to git log
      try {
        const log = gitExec(['log', '--oneline', '-20']);
        const lines = log.split('\n');
        for (const line of lines) {
          const [hash, ...msgParts] = line.split(' ');
          releases.push({
            version: hash,
            date: null,
            notes: msgParts.join(' '),
          });
        }
      } catch {
        // no git log available
      }
    }

    res.json(releases);
  } catch (err) {
    console.error(`[GET /api/releases] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs — read recent log entries
app.get('/api/logs', (req, res) => {
  try {
    ensureDir(LOGS_DIR);
    const logPath = join(LOGS_DIR, 'workforce.jsonl');

    if (!existsSync(logPath)) return res.json([]);

    const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);

    // Return last 100 entries
    const entries = [];
    const start = Math.max(0, lines.length - 100);
    for (let i = start; i < lines.length; i++) {
      try {
        entries.push(JSON.parse(lines[i]));
      } catch {
        // skip malformed lines
      }
    }

    res.json(entries);
  } catch (err) {
    console.error(`[GET /api/logs] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs — append log entry
app.post('/api/logs', (req, res) => {
  try {
    const { level, message, stack, timestamp, url } = req.body;

    ensureDir(LOGS_DIR);
    const logPath = join(LOGS_DIR, 'workforce.jsonl');
    const entry = JSON.stringify({
      level: level || 'info',
      message: message || '',
      stack: stack || null,
      timestamp: timestamp || new Date().toISOString(),
      url: url || null,
    });
    appendFileSync(logPath, entry + '\n', 'utf8');

    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/logs] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Sessions ----

// GET /api/claude-sessions — scan for active Claude sessions
app.get('/api/claude-sessions', (req, res) => {
  try {
    const sessions = [];

    try {
      const psOutput = execFileSync('ps', ['aux'], { stdio: 'pipe', timeout: 5000 }).toString();
      const lines = psOutput.split('\n');

      for (const line of lines) {
        if (!line.includes('claude') || line.includes('grep')) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;

        const pid = parseInt(parts[1], 10);
        const command = parts.slice(10).join(' ');

        // Skip non-Claude processes
        if (!command.includes('claude')) continue;

        sessions.push({
          id: `session-${pid}`,
          pid,
          status: 'running',
          project: null,
          lastActivity: new Date().toISOString(),
          command: command.slice(0, 200),
        });
      }
    } catch {
      // ps command failed — return empty
    }

    res.json(sessions);
  } catch (err) {
    console.error(`[GET /api/claude-sessions] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/reply — send reply to a session
app.post('/api/sessions/:id/reply', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const sessionId = req.params.id;

    // Use tmux sendKeys if available and task has a tmux session
    const task = getTask(sessionId.replace('session-', ''));
    if (isTmuxAvailable() && task?.tmuxSession && hasSession(task.tmuxSession)) {
      sendKeys(task.tmuxSession, message);
      logEvent(task.id, 'reply_sent', `via tmux: ${message}`);
      return res.json({ ok: true, method: 'tmux' });
    }

    // Fallback: write reply file (limited usefulness)
    ensureDir(TASKS_DIR);
    const replyPath = join(TASKS_DIR, `${sessionId}.reply`);
    writeFileSync(replyPath, message, 'utf8');
    res.json({ ok: true, method: 'file' });
  } catch (err) {
    console.error(`[POST /api/sessions/:id/reply] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Projects ----

// GET /api/projects — derive project list from tasks
app.get('/api/projects', (req, res) => {
  try {
    const allTasks = getAllTasks(true);
    const projectMap = new Map();

    for (const task of allTasks) {
      const name = task.project || '(no project)';
      if (!projectMap.has(name)) {
        projectMap.set(name, { name, taskCount: 0, statusBreakdown: {} });
      }
      const proj = projectMap.get(name);
      proj.taskCount++;
      proj.statusBreakdown[task.status] = (proj.statusBreakdown[task.status] || 0) + 1;
    }

    res.json([...projectMap.values()]);
  } catch (err) {
    console.error(`[GET /api/projects] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:name/done — cancel running tasks, archive done tasks
app.post('/api/projects/:name/done', async (req, res) => {
  try {
    const projectName = req.params.name;
    const allTasks = getAllTasks(true);
    const projectTasks = allTasks.filter((t) => t.project === projectName);

    for (const task of projectTasks) {
      if (task.status === 'running') {
        // Cancel running tasks
        if (task.pid) {
          try {
            process.kill(task.pid, 'SIGTERM');
          } catch {
            // already dead
          }
        }
        updateTask(task.id, {
          status: 'failed',
          error: 'Project marked as done',
          completedAt: new Date().toISOString(),
        });
        cancelTaskToken(task.id);
        releaseTaskClaim(task.id);
        removeWorker(task.id);
        if (task.worktreePath) cleanupWorktree(task.id, task.worktreePath);
      } else if (task.status === 'done') {
        // Archive done tasks
        updateTask(task.id, {
          status: 'archived',
          archivedAt: new Date().toISOString(),
        });
      }
    }

    await broadcastTasks();
    res.json({ ok: true });
  } catch (err) {
    console.error(`[POST /api/projects/:name/done] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---- Code Search ----

// GET /api/code-search — search the codebase
app.get('/api/code-search', (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'query parameter q is required' });

    const results = searchCode(q);
    res.json(results);
  } catch (err) {
    console.error(`[GET /api/code-search] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// Startup
// =========================================================================
async function startup() {
  console.log('[server] Starting Workforce...');

  // 1. Initialize database
  getDb();
  console.log('[server] Database initialized');

  // Validate Claude CLI
  if (!existsSync(CLAUDE_CLI) && CLAUDE_CLI !== 'claude') {
    console.warn(`[server] Warning: Claude CLI not found at ${CLAUDE_CLI}`);
  } else {
    console.log(`[server] Claude CLI: ${CLAUDE_CLI}`);
  }

  // 2. Clean orphaned workers from previous server instance
  try {
    const db = getDb();
    const orphans = db.prepare('SELECT * FROM workers').all();
    for (const w of orphans) {
      removeWorker(w.taskId);
    }
    if (orphans.length > 0) {
      console.log(`[server] Cleaned ${orphans.length} orphaned worker(s)`);
    }
  } catch (err) {
    console.warn('[server] Failed to clean orphaned workers:', err.message);
  }

  // 3. Load cost model
  loadCostModel();

  // 3b. Load agent profiles
  loadProfiles();

  // 4. Prune git worktrees
  try {
    gitExec(['worktree', 'prune'], { cwd: PROJECT_DIR });
    console.log('[server] Git worktrees pruned');
  } catch (err) {
    console.warn('[server] git worktree prune failed:', err.message);
  }

  // 5. Check for and abort any in-progress merge
  try {
    const mergeHead = join(PROJECT_DIR, '.git', 'MERGE_HEAD');
    if (existsSync(mergeHead)) {
      console.warn('[server] Detected in-progress merge, aborting...');
      gitExec(['merge', '--abort'], { cwd: PROJECT_DIR });
      console.log('[server] Aborted stale merge');
    }
  } catch (err) {
    console.warn('[server] Failed to check/abort merge:', err.message);
  }

  // 6. Start recovery engine
  try {
    setProjectDir(PROJECT_DIR);
    stopRecovery = startRecoveryEngine();
    console.log('[server] Recovery engine started');
  } catch (err) {
    console.warn('[server] Recovery engine failed to start:', err.message);
  }

  // 7. Start HTTP server
  server.listen(PORT, () => {
    console.log(`[server] Workforce running on http://localhost:${PORT}`);
    console.log(`[server] WebSocket available on ws://localhost:${PORT}`);
    console.log(`[server] Project directory: ${PROJECT_DIR}`);
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function gracefulShutdown(signal) {
  console.log(`[server] Received ${signal}, shutting down...`);

  // Stop recovery engine
  if (stopRecovery) stopRecovery();

  // Close WebSocket connections
  for (const client of wss.clients) {
    client.close();
  }

  // Close HTTP server
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[server] Forced exit after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startup().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});

export { app, server, broadcast, promotePending };
